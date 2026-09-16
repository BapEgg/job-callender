import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const test = process.argv.includes("--test");
const compose = ["compose", ...(test ? ["-f", "compose.test.yaml"] : [])];
const user = test ? "testuser" : "jobprep",
  database = test ? "testdb" : "jobprep";
const destination = path.resolve(
  "backups",
  `${test ? "test" : "personal"}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
await fs.mkdir(destination, { recursive: true });
function docker(args, input) {
  const r = spawnSync("docker", args, {
    input,
    maxBuffer: 100 * 1024 * 1024,
    windowsHide: true,
  });
  if (r.status !== 0)
    throw Error(
      `Docker ${args[0]} failed (details withheld to protect private data)`,
    );
  return r.stdout;
}
const dump = docker([
  ...compose,
  "exec",
  "-T",
  "db",
  "pg_dump",
  "-U",
  user,
  "-d",
  database,
  "-Fc",
]);
await fs.writeFile(path.join(destination, "database.dump"), dump, {
  mode: 0o600,
});
docker([...compose, "cp", "web:/data/files", path.join(destination, "files")]);
const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p);
    else {
      const b = await fs.readFile(p);
      files.push({
        path: path.relative(destination, p),
        sha256: createHash("sha256").update(b).digest("hex"),
        bytes: b.length,
      });
    }
  }
}
await walk(destination);
await fs.writeFile(
  path.join(destination, "manifest.json"),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      scope: test ? "isolated fixtures" : "personal",
      files,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `Backup saved: ${destination} (${files.length} files). No retention deletion performed.`,
);
