import { readFile } from "node:fs/promises";
import { pool, query } from "../src/db.js";

try {
  const migration = await readFile(new URL("../db/migrations/001_initial.sql", import.meta.url), "utf8");
  await query(migration);
  console.log("Database migration applied.");
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
