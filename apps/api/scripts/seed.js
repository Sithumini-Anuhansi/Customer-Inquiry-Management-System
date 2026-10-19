import "dotenv/config";
import { pool } from "../src/db.js";
import { seedStaffAccount } from "../src/auth.js";

try {
  await seedStaffAccount();
} catch (error) {
  console.error("Staff seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
