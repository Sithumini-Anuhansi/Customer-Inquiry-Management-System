import { readdir, readFile } from "node:fs/promises";
import { pool, query } from "../src/db.js";

try {
  const migrationsUrl = new URL("../db/migrations/", import.meta.url);
  const migrationFiles = (await readdir(migrationsUrl)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    await query(await readFile(new URL(file, migrationsUrl), "utf8"));
    console.log(`Applied database migration ${file}.`);
  }
} catch (error) {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
