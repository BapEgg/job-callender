// Explicit local administrator command, intended inside the web container.
// Supply {username,password} through stdin, never command-line arguments or chat.
import { pool, transaction } from "../server/db.mjs";
import { passwordHash } from "../server/auth.mjs";
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
let input;
try {
  input = JSON.parse(Buffer.concat(chunks).toString());
} catch {
  throw Error("Provide JSON through stdin.");
}
if (
  typeof input.username !== "string" ||
  typeof input.password !== "string" ||
  input.password.length < 12 ||
  input.password.length > 256
)
  throw Error("Invalid username or password length.");
try {
  const hash = await passwordHash(input.password);
  await transaction(async (c) => {
    const { rows } = await c.query(
      "UPDATE users SET password_hash=$2 WHERE username=$1 RETURNING id",
      [input.username.toLowerCase(), hash],
    );
    if (!rows[0]) throw Error("Account not found.");
    await c.query("DELETE FROM sessions WHERE user_id=$1", [rows[0].id]);
  });
  console.log("Password changed; existing sessions invalidated.");
} finally {
  await pool.end();
}
