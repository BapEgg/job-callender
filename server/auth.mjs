import { scrypt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "./db.mjs";
const derive = promisify(scrypt),
  opts = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, opts);
  return `${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(password, stored) {
  const [salt, hex] = stored.split(":");
  const key = await derive(password, salt, 64, opts);
  const expected = Buffer.from(hex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function sessionToken(req) {
  return (
    (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("junbisil_session="))
      ?.slice(17) || ""
  );
}
export async function userFor(req) {
  const token = sessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const { rows } = await pool.query(
    "SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
    [digest(token)],
  );
  return rows[0] || null;
}
export async function newSession(userId, res) {
  const token = randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [digest(token), userId],
  );
  res.setHeader(
    "Set-Cookie",
    `junbisil_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.COOKIE_SECURE === "true" ? "; Secure" : ""}`,
  );
}
