import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { query } from "./db.js";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "inquiry_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [salt, expectedHex] = String(encoded).split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
  };
}

export async function requireAuth(request, response, next) {
  const token = request.cookies?.[SESSION_COOKIE];
  if (!token) return response.status(401).json({ error: "Sign in is required." });

  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.display_name
       FROM staff_sessions s JOIN staff_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashSessionToken(token)],
    );
    if (!rows[0]) return response.status(401).json({ error: "Your session has expired. Please sign in again." });
    request.user = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}
