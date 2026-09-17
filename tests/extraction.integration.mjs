import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
const base = "http://127.0.0.1:3001";
async function request(
  route,
  { cookie = "", data, method = data ? "POST" : "GET", origin = base } = {},
) {
  const r = await fetch(base + route, {
    method,
    headers: {
      cookie,
      origin,
      ...(data ? { "content-type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
// Minimal synthetic PDF syntax fixture: no real personal document or AI call.
function pdf(text) {
  const stream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let s = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(s));
    s += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(s);
  s += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(s);
}
const suffix = randomUUID().slice(0, 8),
  password = randomUUID() + "A1!";
const a = await request("/api/auth/register", {
  data: { username: "extract-a-" + suffix, password },
});
const b = await request("/api/auth/register", {
  data: { username: "extract-b-" + suffix, password },
});
assert.equal(a.status, 200);
assert.equal(b.status, 200);
const results = [];
for (const [name, bytes, status, text] of [
  [
    "source.pdf",
    pdf("Confirmed fixture Java project"),
    "ready",
    "Confirmed fixture Java project",
  ],
  ["scan.pdf", pdf(""), "needs_text", ""],
  ["broken.pdf", Buffer.from("%PDF-broken"), "failed", ""],
  [
    "source.txt",
    Buffer.from("본인 역할: API 구현"),
    "ready",
    "본인 역할: API 구현",
  ],
  ["unsupported.docx", Buffer.from("fixture"), "unsupported", ""],
]) {
  const uploaded = await request("/api/files", {
    cookie: a.cookie,
    data: { name, base64: bytes.toString("base64") },
  });
  assert.equal(uploaded.status, 201);
  const id = uploaded.data.file.id,
    route = `/api/files/${id}/extract`;
  assert.equal((await request(route, { data: {} })).status, 401);
  assert.equal(
    (await request(route, { cookie: b.cookie, data: {} })).status,
    404,
  );
  assert.equal(
    (
      await request(route, {
        cookie: a.cookie,
        data: {},
        origin: "https://evil.example",
      })
    ).status,
    403,
  );
  const r = await request(route, { cookie: a.cookie, data: {} });
  assert.equal(r.status, 200);
  assert.equal(r.data.extraction.status, status);
  assert.equal(r.data.extraction.text, text);
  const saved = await fetch(base + `/api/files/${id}`, {
    headers: { cookie: a.cookie },
  });
  assert.deepEqual(Buffer.from(await saved.arrayBuffer()), bytes);
  results.push({ name, status, ownerIsolation: true, originalPreserved: true });
}
await fs.mkdir("artifacts/api", { recursive: true });
await fs.writeFile(
  "artifacts/api/extraction.json",
  JSON.stringify({ passed: true, results }, null, 2),
);
console.log(JSON.stringify({ passed: true, groups: results.length }));
