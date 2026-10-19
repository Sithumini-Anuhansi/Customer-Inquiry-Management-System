import { Router } from "express";
import { query } from "./db.js";
import { cookieOptions, hashPassword, hashSessionToken, newSessionToken, requireAuth, SESSION_COOKIE, SESSION_TTL_MS, verifyPassword } from "./security.js";

export const authRouter = Router();

authRouter.post("/login", async (request, response, next) => {
  const { email, password } = request.body ?? {};
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return response.status(400).json({ error: "Email and password are required." });
  }
  try {
    const { rows } = await query("SELECT id, email, display_name, password_hash FROM staff_users WHERE email = $1", [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return response.status(401).json({ error: "Email or password is incorrect." });
    }
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await query("INSERT INTO staff_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [hashSessionToken(token), user.id, expiresAt]);
    response.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_MS });
    return response.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", async (request, response, next) => {
  const token = request.cookies?.[SESSION_COOKIE];
  try {
    if (token) await query("DELETE FROM staff_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
    response.clearCookie(SESSION_COOKIE, cookieOptions());
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, (request, response) => {
  response.json({ user: { id: request.user.id, email: request.user.email, displayName: request.user.display_name } });
});

export async function seedStaffAccount() {
  const email = process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_STAFF_PASSWORD;
  const displayName = process.env.SEED_STAFF_NAME?.trim() || "Coffee Ninja Staff";
  if (!email || !password) throw new Error("Set SEED_STAFF_EMAIL and SEED_STAFF_PASSWORD before seeding a staff account.");
  if (password.length < 12) throw new Error("SEED_STAFF_PASSWORD must be at least 12 characters.");
  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO staff_users (email, display_name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash`,
    [email, displayName, passwordHash],
  );
  console.log(`Seeded staff account: ${email}`);
}
