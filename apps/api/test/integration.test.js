import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a disposable PostgreSQL database before running API integration tests.");
}

const migrationsDirectory = new URL("../db/migrations/", import.meta.url);
const schema = `inquiry_test_${randomBytes(6).toString("hex")}`;
const schemaIdentifier = `"${schema}"`;
const connectionUrl = new URL(testDatabaseUrl);
connectionUrl.searchParams.set("options", `-c search_path=${schema},public`);
process.env.DATABASE_URL = connectionUrl.toString();

const { default: pg } = await import("pg");
const admin = new pg.Client({ connectionString: testDatabaseUrl });
let pool;
let server;

async function closeServer() {
  if (!server) return;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  server = null;
}

test("API authentication, inquiry persistence, status history, conflicts, and expiry", async (t) => {
  try {
    await admin.connect();
    await admin.query(`CREATE SCHEMA ${schemaIdentifier}`);
    await admin.query(`SET search_path TO ${schemaIdentifier}, public`);
    const migrationFiles = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of migrationFiles) {
      await admin.query(await readFile(new URL(file, migrationsDirectory), "utf8"));
    }

    const [{ app }, db, security] = await Promise.all([
      import("../src/app.js"),
      import("../src/db.js"),
      import("../src/security.js"),
    ]);
    pool = db.pool;
    const email = `api-test-${randomBytes(4).toString("hex")}@example.test`;
    const password = "Integration-Test-Password-123!";
    const passwordHash = await security.hashPassword(password);
    await db.query(
      "INSERT INTO staff_users (email, display_name, password_hash) VALUES ($1, $2, $3)",
      [email, "Integration Test Staff", passwordHash],
    );

    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const request = (path, options = {}) => fetch(`${baseUrl}${path}`, options);

    await t.test("inquiry routes reject unauthenticated requests", async () => {
      const response = await request("/api/inquiries");
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /sign in/i);
    });

    let cookie;
    await t.test("login issues a protected session and inquiry CRUD persists to PostgreSQL", async () => {
      const invalidLogin = await request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "incorrect-password" }),
      });
      assert.equal(invalidLogin.status, 401);

      const login = await request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(login.status, 200);
      const loginBody = await login.json();
      assert.equal(loginBody.user.email, email);
      const setCookie = login.headers.get("set-cookie");
      assert.ok(setCookie?.includes("HttpOnly"));
      assert.match(setCookie, /Max-Age=604800(?:;|$)/i);
      assert.match(setCookie, /Path=\/api(?:;|$)/i);
      assert.match(setCookie, /SameSite=Lax/i);
      cookie = setCookie.split(";")[0];

      const me = await request("/api/auth/me", { headers: { cookie } });
      assert.equal(me.status, 200);
      assert.equal((await me.json()).user.displayName, "Integration Test Staff");

      const invalidCreate = await request("/api/inquiries", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ customerName: "", contact: "", subject: "", description: "" }),
      });
      assert.equal(invalidCreate.status, 400);

      const create = await request("/api/inquiries", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          customerName: "Integration Customer",
          contact: "integration@example.test",
          subject: "Database-backed inquiry",
          description: "Created by the API integration test.",
        }),
      });
      assert.equal(create.status, 201);
      const created = (await create.json()).inquiry;
      assert.match(created.displayId, /^INQ-ID-\d{3,}$/);
      assert.equal(created.status, "New");

      const list = await request("/api/inquiries?search=Integration%20Customer", { headers: { cookie } });
      assert.equal(list.status, 200);
      assert.equal((await list.json()).inquiries.some((inquiry) => inquiry.id === created.id), true);

      const detail = await request(`/api/inquiries/${created.id}`, { headers: { cookie } });
      assert.equal(detail.status, 200);
      const opened = (await detail.json()).inquiry;
      assert.equal(opened.statusHistory.length, 1);
      assert.equal(opened.statusHistory[0].fromStatus, null);
      assert.equal(opened.statusHistory[0].toStatus, "New");

      await new Promise((resolve) => setTimeout(resolve, 5));
      const transition = await request(`/api/inquiries/${created.id}/status`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ status: "In Progress", expectedUpdatedAt: opened.updatedAt }),
      });
      assert.equal(transition.status, 200);
      const updated = (await transition.json()).inquiry;
      assert.equal(updated.status, "In Progress");

      const staleUpdate = await request(`/api/inquiries/${created.id}/status`, {
        method: "PATCH",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ status: "Resolved", expectedUpdatedAt: opened.updatedAt }),
      });
      assert.equal(staleUpdate.status, 409);

      const updatedDetail = await request(`/api/inquiries/${created.id}`, { headers: { cookie } });
      const history = (await updatedDetail.json()).inquiry.statusHistory;
      assert.equal(history.length, 2);
      assert.equal(history[0].fromStatus, "New");
      assert.equal(history[0].toStatus, "In Progress");
    });

    await t.test("expired persisted sessions are rejected and logout clears the session", async () => {
      const token = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1));
      await db.query(
        "UPDATE staff_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1",
        [security.hashSessionToken(token)],
      );
      const expired = await request("/api/auth/me", { headers: { cookie } });
      assert.equal(expired.status, 401);
      assert.match((await expired.json()).error, /expired/i);

      const logout = await request("/api/auth/logout", { method: "POST", headers: { cookie } });
      assert.equal(logout.status, 204);
      const rejectedAfterLogout = await request("/api/auth/me", { headers: { cookie } });
      assert.equal(rejectedAfterLogout.status, 401);
    });
  } finally {
    await closeServer();
    await pool?.end();
    if (admin._connected) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schemaIdentifier} CASCADE`).catch(() => {});
      await admin.end();
    }
  }
});
