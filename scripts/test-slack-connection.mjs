// Explicit command sends one clearly labelled Slack connection test using private .env.
import fs from "node:fs/promises";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { deliver } from "../runner/slack.mjs";
if (!process.argv.includes("--send"))
  throw Error("Explicit --send is required.");
const env = await fs.readFile(".env", "utf8");
const value = (name) =>
  env.match(new RegExp("^" + name + "=(.+)$", "m"))?.[1].trim();
const c = new pg.Client({
  host: "127.0.0.1",
  port: 5433,
  database: "jobprep",
  user: "jobprep",
  password: value("POSTGRES_PASSWORD"),
});
try {
  await c.connect();
  const { rows } = await c.query("select user_id from user_state");
  if (rows.length !== 1) throw Error("Requires exactly one local owner.");
  const key = "connection-test:" + randomUUID();
  const payload = {
    type: "summary",
    test: true,
    added: 0,
    changed: 0,
    jobs: [],
  };
  await c.query(
    "insert into notification_records(user_id,key,status,payload,attempted_at) values($1,$2,'uncertain',$3,now())",
    [rows[0].user_id, key, payload],
  );
  const status = await deliver(value("SLACK_WEBHOOK"), payload);
  await c.query(
    "update notification_records set status=$3 where user_id=$1 and key=$2",
    [rows[0].user_id, key, status],
  );
  await fs.mkdir("artifacts/automation", { recursive: true });
  await fs.writeFile(
    "artifacts/automation/slack-connection-test.json",
    JSON.stringify({
      status,
      test: true,
      attemptedAt: new Date().toISOString(),
      externalPosts: 1,
    }),
  );
  console.log(JSON.stringify({ status, test: true, externalPosts: 1 }));
  if (status !== "sent") process.exitCode = 1;
} finally {
  await c.end();
}
