import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { createHash } from "node:crypto";
const source = await fs.readFile("references/jobprep_dark_prototype.html");
if (
  createHash("sha256").update(source).digest("hex") !==
  "f1e964ee2428e8e5da3505b313661639495a746dd9015767200b4e6bb13f3619"
)
  throw Error("Source changed");
const dir = "artifacts/visual-all";
const baselineDir = "tests/visual/full-baseline";
const manifest = JSON.parse(
  await fs.readFile(`${baselineDir}/manifest.json`, "utf8"),
);
for (const [name, hash] of Object.entries(manifest.files)) {
  if (
    createHash("sha256")
      .update(await fs.readFile(`${baselineDir}/${name}`))
      .digest("hex") !== hash
  )
    throw Error(`Original baseline changed: ${name}`);
}
await fs.mkdir(dir, { recursive: true });
const routes = [
  "login",
  "signup",
  "onboarding",
  "home",
  "jobs",
  "job/j1",
  "applications",
  "workspace/a1",
  "write/a1",
  "submission/a1",
  "prep/a2",
  "data",
  "experiences",
  "calendar",
  "settings",
];
const browser = await chromium.launch({ channel: "msedge" }),
  results = [];
const requestedWidth = Number(
  process.argv.find((v) => v.startsWith("--width="))?.split("=")[1],
);
const selectors = [
  ".auth-wrap",
  ".auth-story",
  ".auth-form-wrap",
  ".onboarding",
  ".sidebar",
  ".topbar",
  ".page",
  ".page-head",
  ".tabs",
  ".cols-main",
  ".cols-half",
  ".writer",
  ".panel",
  ".board",
  ".calendar-grid",
];
try {
  for (const width of requestedWidth
    ? [requestedWidth]
    : [1440, 1280, 768, 390])
    for (const route of routes) {
      const key = route.replace("/", "-") + "-" + width,
        captures = {};
      for (const kind of ["reference", "actual"]) {
        const context = await browser.newContext({
            viewport: { width, height: 900 },
            deviceScaleFactor: 1,
            locale: "ko-KR",
            timezoneId: "Asia/Seoul",
            reducedMotion: "reduce",
          }),
          page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(
          kind === "reference"
            ? `http://127.0.0.1:5173/references/jobprep_dark_prototype.html#${route}`
            : `http://127.0.0.1:5173/?fixture=1#${route}`,
        );
        await page.locator("h1:visible,h2:visible").first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.evaluate(
          (selectors) =>
            Object.fromEntries(
              selectors.map((s) => [
                s,
                [...document.querySelectorAll(s)].map((e) => {
                  const r = e.getBoundingClientRect();
                  return { x: r.x, y: r.y, width: r.width, height: r.height };
                }),
              ]),
            ),
          selectors,
        );
        const exceptions = await page.evaluate(
          ({ kind, route }) => {
            const specs = [];
            if (document.querySelector(".page-note"))
              specs.push([
                ".page-note",
                kind === "reference"
                  ? "입력한 변경은 이 브라우저에만 저장됩니다."
                  : "입력 변경은 현재 탭에서만 유지됩니다.",
              ]);
            if (route === "write/a1")
              specs.push(
                [
                  "#save-state",
                  kind === "reference" ? " 브라우저 저장" : " 탭 안에 유지",
                ],
                [
                  ".editor-actionbar + p",
                  kind === "reference"
                    ? "이 버튼은 미리 작성한 예시 답변을 불러옵니다. 실제 모델 호출·전송·과금은 없습니다."
                    : "실제 AI 실행기는 미연결 상태입니다. 초안을 유지하며 실제 모델 호출·전송·과금은 없습니다.",
                ],
              );
            return specs.map(([selector, text]) => {
              const el = document.querySelector(selector),
                walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT),
                boxes = [];
              let n;
              while ((n = walker.nextNode())) {
                const start = n.textContent.indexOf(text);
                if (start < 0) continue;
                const r = document.createRange();
                r.setStart(n, start);
                r.setEnd(n, start + text.length);
                for (const b of r.getClientRects())
                  boxes.push({
                    x: b.x,
                    y: b.y,
                    width: b.width,
                    height: b.height,
                  });
              }
              if (!boxes.length)
                throw Error("Unexpected exception text: " + selector);
              return { selector, text, boxes };
            });
          },
          { kind, route },
        );
        const file = `${kind === "reference" ? baselineDir : dir}/${key}-${kind}.png`;
        if (kind === "reference") {
          await fs.access(file);
        } else
          await page.screenshot({
            path: file,
            fullPage: true,
            animations: "disabled",
          });
        captures[kind] = { file, geometry, errors, exceptions };
        await context.close();
      }
      const a = PNG.sync.read(await fs.readFile(captures.reference.file)),
        b = PNG.sync.read(await fs.readFile(captures.actual.file));
      for (const e of [
        ...captures.reference.exceptions,
        ...captures.actual.exceptions,
      ])
        for (const r of e.boxes)
          for (const png of [a, b])
            for (
              let y = Math.max(0, Math.floor(r.y));
              y < Math.min(png.height, Math.ceil(r.y + r.height));
              y++
            )
              for (
                let x = Math.max(0, Math.floor(r.x));
                x < Math.min(png.width, Math.ceil(r.x + r.width));
                x++
              ) {
                const at = (y * png.width + x) * 4;
                png.data[at] = 255;
                png.data[at + 1] = 0;
                png.data[at + 2] = 255;
                png.data[at + 3] = 255;
              }
      const result = {
        key,
        ...captures,
        geometryMatch:
          JSON.stringify(captures.reference.geometry) ===
          JSON.stringify(captures.actual.geometry),
      };
      if (a.width === b.width && a.height === b.height) {
        const diff = new PNG({ width: a.width, height: a.height });
        result.changedPixels = pixelmatch(
          a.data,
          b.data,
          diff.data,
          a.width,
          a.height,
          { threshold: 0.1 },
        );
        result.ratio = result.changedPixels / (a.width * a.height);
        await fs.writeFile(`${dir}/${key}-diff.png`, PNG.sync.write(diff));
      }
      result.passed =
        result.geometryMatch &&
        result.ratio <= 0.001 &&
        !captures.actual.errors.length;
      results.push(result);
      console.log(
        key,
        result.passed
          ? "PASS"
          : `REVIEW geometry=${result.geometryMatch} ratio=${result.ratio}`,
      );
    }
} finally {
  await browser.close();
  await fs.writeFile(
    `${dir}/report${requestedWidth ? "-" + requestedWidth : ""}.json`,
    JSON.stringify(
      {
        scope:
          "15-screen comparison; exact checked storage/disconnected text ranges excepted; raw PNG preserved",
        results,
      },
      null,
      2,
    ),
  );
}
if (results.some((r) => !r.passed)) process.exitCode = 1;
