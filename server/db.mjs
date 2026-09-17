import pg from "pg";
import fs from "node:fs/promises";
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
});
// A restarted local DB invalidates idle connections; the pool replaces them.
pool.on("error", (error) =>
  console.error("database connection interrupted", error.code || error.name),
);
export async function migrate() {
  await pool.query(
    await fs.readFile(
      new URL("../db/001-initial.sql", import.meta.url),
      "utf8",
    ),
  );
}
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
