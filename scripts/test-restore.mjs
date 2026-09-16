import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
const dirs = (await fs.readdir("backups"))
  .filter((x) => x.startsWith("test-"))
  .sort();
if (!dirs.length) throw Error("Run node scripts/backup.mjs --test first.");
const source = path.resolve("backups", dirs.at(-1)),
  manifest = JSON.parse(
    await fs.readFile(path.join(source, "manifest.json"), "utf8"),
  );
if (manifest.scope !== "isolated fixtures")
  throw Error(
    "Only isolated fixture backups can be restored by this verifier.",
  );
for (const file of manifest.files) {
  const b = await fs.readFile(path.join(source, file.path));
  if (createHash("sha256").update(b).digest("hex") !== file.sha256)
    throw Error("Backup integrity check failed.");
}
const database = "restore_" + randomUUID().replaceAll("-", "");
function docker(args, input) {
  const r = spawnSync(
    "docker",
    ["compose", "-f", "compose.test.yaml", "exec", "-T", "db", ...args],
    { input, maxBuffer: 100 * 1024 * 1024, windowsHide: true },
  );
  if (r.status !== 0) throw Error(`Fixture restore command failed: ${args[0]}`);
  return r.stdout.toString();
}
docker(["createdb", "-U", "testuser", database]);
docker(
  ["pg_restore", "-U", "testuser", "-d", database, "--exit-on-error"],
  await fs.readFile(path.join(source, "database.dump")),
);
const counts = docker([
  "psql",
  "-U",
  "testuser",
  "-d",
  database,
  "-At",
  "-c",
  "SELECT json_build_object('users',(SELECT count(*) FROM users),'submissions',(SELECT count(*) FROM submissions),'files',(SELECT count(*) FROM files),'history',(SELECT count(*) FROM state_history));",
]);
const data = JSON.parse(counts);
if (data.submissions < 1 || data.files < 1 || data.history < 1)
  throw Error("Expected fixture records missing after restore.");
const restoredFiles = path.join("private", "restore-fixture-files", database);
await fs.mkdir(restoredFiles, { recursive: true });
for (const file of manifest.files.filter((f) => f.path.startsWith("files"))) {
  const target = path.join(restoredFiles, path.basename(file.path));
  await fs.copyFile(path.join(source, file.path), target);
  if (
    createHash("sha256")
      .update(await fs.readFile(target))
      .digest("hex") !== file.sha256
  )
    throw Error("Restored attachment hash mismatch");
}
await fs.mkdir("artifacts/api", { recursive: true });
await fs.writeFile(
  "artifacts/api/restore.json",
  JSON.stringify(
    {
      passed: true,
      scope: "isolated fixture database and attachments",
      database,
      counts: data,
      verifiedFiles: manifest.files.length,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    passed: true,
    counts: data,
    verifiedFiles: manifest.files.length,
  }),
);
