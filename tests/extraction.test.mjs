import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { extractFile } from "../server/extraction.mjs";
async function fixture(bytes, mime, fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "jobprep-extract-test-"));
  const name = path.join(dir, "fixed-id");
  await fs.writeFile(name, bytes);
  try {
    await fn(
      { mime, sha256: createHash("sha256").update(bytes).digest("hex") },
      name,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
test("UTF-8 content, original checksum and no silent text truncation", async () => {
  await fixture(
    Buffer.from("본인 역할\nJava API 구현"),
    "text/plain",
    async (f, p) => {
      const r = await extractFile(f, p);
      assert.equal(r.status, "ready");
      assert.match(r.text, /본인 역할/);
      assert.equal(
        (await extractFile({ ...f, sha256: "invalid" }, p)).status,
        "failed",
      );
    },
  );
  await fixture(Buffer.from("x".repeat(50001)), "text/plain", async (f, p) =>
    assert.equal((await extractFile(f, p)).status, "needs_text"),
  );
  await fixture(Buffer.from([0xff, 0xfe, 0x61]), "text/plain", async (f, p) =>
    assert.equal((await extractFile(f, p)).status, "needs_text"),
  );
});
test("PDF bounded commands, scan, encryption, limits, tool errors and unsupported format", async () => {
  await fixture(
    Buffer.from("%PDF-1.4 test"),
    "application/pdf",
    async (f, p) => {
      let calls = 0;
      const r = await extractFile(f, p, async (cmd, args, options) => {
        calls++;
        assert.equal(options.timeout, 15000);
        assert.equal(options.maxBuffer, 1000000);
        if (cmd === "pdfinfo") {
          assert.deepEqual(args, [p]);
          return { stdout: "Pages: 2\nEncrypted: no\n" };
        }
        assert.equal(cmd, "pdftotext");
        assert.deepEqual(args, [
          "-enc",
          "UTF-8",
          "-layout",
          "-f",
          "1",
          "-l",
          "2",
          p,
          "-",
        ]);
        return { stdout: "Page one\fPage two" };
      });
      assert.equal(calls, 2);
      assert.equal(r.pages, 2);
      assert.match(r.text, /Page two/);
      for (const info of [
        "Pages: 51\nEncrypted: no",
        "Pages: 1\nEncrypted: yes",
      ])
        assert.equal(
          (await extractFile(f, p, async () => ({ stdout: info }))).status,
          "needs_text",
        );
      assert.equal(
        (
          await extractFile(f, p, async (cmd) => ({
            stdout: cmd === "pdfinfo" ? "Pages: 1\nEncrypted: no" : "\f",
          }))
        ).status,
        "needs_text",
      );
      const failed = await extractFile(f, p, async () => {
        throw Error("private document text");
      });
      assert.equal(failed.status, "failed");
      assert.doesNotMatch(JSON.stringify(failed), /private document/);
      assert.equal(
        (await extractFile({ ...f, mime: "application/zip" }, p)).status,
        "unsupported",
      );
    },
  );
});
