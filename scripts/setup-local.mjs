import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
try {
  await fs.writeFile(
    ".env",
    `POSTGRES_PASSWORD=${randomBytes(32).toString("hex")}\nRUNNER_TOKEN=${randomBytes(32).toString("hex")}\n`,
    { flag: "wx", mode: 0o600 },
  );
  console.log("Created private .env (values not printed).");
} catch (error) {
  if (error.code === "EEXIST") console.log("Existing .env preserved.");
  else throw error;
}
