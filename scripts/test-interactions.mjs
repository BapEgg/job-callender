import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
await fs.mkdir("artifacts/qa", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "ko-KR",
});
const page = await context.newPage(),
  results = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: e.message });
  }
}
function assert(value, message) {
  if (!value) throw Error(message);
}
async function route(hash) {
  await page.evaluate((h) => (location.hash = h), hash);
  await page.waitForTimeout(70);
}
await page.goto("http://127.0.0.1:5173/?fixture=1#jobs");
await check("search-filter-bookmark", async () => {
  await page.locator("#jobs-search").fill("모노페이");
  assert(
    (await page.locator("tbody tr").count()) === 1,
    "search should find one",
  );
  const bookmark = page.locator("tbody .bookmark");
  await bookmark.click();
  assert(
    (await bookmark.getAttribute("aria-pressed")) === "false",
    "initial saved removed",
  );
  await bookmark.click();
  assert(
    (await bookmark.getAttribute("aria-pressed")) === "true",
    "saved restored",
  );
  await page.locator("#jobs-search").fill("");
  await page.locator("#jobs-exp").selectOption("신입");
  assert(
    (await page.locator("tbody tr").allTextContents()).every(
      (t) => !t.includes("신입·주니어"),
    ),
    "experience filter",
  );
  await page.locator("#jobs-exp").selectOption("all");
  await page.locator("#jobs-deadline").selectOption("rolling");
  assert(
    (await page.locator("tbody tr").allTextContents()).every((t) =>
      t.includes("상시채용"),
    ),
    "rolling filter",
  );
  await page.locator('[data-action="reset-filters"]').first().click();
  assert((await page.locator("tbody tr").count()) === 12, "reset 12");
});
await route("write/a1");
await check("question-and-route-input-preservation", async () => {
  await page.locator("#draft-editor").fill("독립 QA 보존 검사 😀");
  await page.locator('[data-action="select-question"][data-id="q2"]').click();
  await page.locator('[data-action="select-question"][data-id="q1"]').click();
  assert(
    (await page.locator("#draft-editor").inputValue()) ===
      "독립 QA 보존 검사 😀",
    "question switch preservation",
  );
  await route("home");
  await route("jobs");
  await route("write/a1");
  assert(
    (await page.locator("#draft-editor").inputValue()) ===
      "독립 QA 보존 검사 😀",
    "route preservation",
  );
});
await check("unicode-boundaries-499-500-700-701-emoji", async () => {
  for (const [n, status] of [
    [499, "최소 분량 미달"],
    [500, "분량 충족"],
    [700, "분량 충족"],
    [701, "최대 분량 초과"],
  ]) {
    await page.locator("#draft-editor").fill("가".repeat(n));
    assert(
      (await page.locator("#char-count").textContent()) === String(n),
      "count " + n,
    );
    assert(
      (await page.locator("#char-status").textContent()) === status,
      "status " + n,
    );
  }
  await page.locator("#draft-editor").fill("😀".repeat(500));
  assert(
    (await page.locator("#char-count").textContent()) === "500",
    "emoji codepoint count",
  );
});
await check(
  "disconnected-generation-preserves-input-and-dialog-focus",
  async () => {
    const trigger = page.locator('[data-action="generate"]');
    await trigger.click();
    assert(
      (await page.getByRole("dialog").textContent()).includes("미연결"),
      "disconnected status",
    );
    const closeIcon = page.getByRole("button", { name: "창 닫기" });
    assert(
      await closeIcon.evaluate((e) => e === document.activeElement),
      "initial focus",
    );
    await page.keyboard.press("Shift+Tab");
    assert(
      await page
        .getByRole("button", { name: "닫기", exact: true })
        .evaluate((e) => e === document.activeElement),
      "reverse wrap",
    );
    await page.keyboard.press("Tab");
    assert(
      await closeIcon.evaluate((e) => e === document.activeElement),
      "forward wrap",
    );
    await page.keyboard.press("Escape");
    assert((await page.getByRole("dialog").count()) === 0, "Escape close");
    assert(
      await trigger.evaluate((e) => e === document.activeElement),
      "trigger focus restore",
    );
    assert(
      (await page.locator("#draft-editor").inputValue()) === "😀".repeat(500),
      "generation preserves",
    );
  },
);
const overflow = [];
await page.setViewportSize({ width: 390, height: 900 });
for (const r of ["home", "jobs", "write/a1"])
  await check("390-overflow-" + r, async () => {
    await route(r);
    const sizes = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      tables: [...document.querySelectorAll(".table-wrap")].map((e) => ({
        client: e.clientWidth,
        scroll: e.scrollWidth,
      })),
    }));
    overflow.push({ route: r, ...sizes });
    assert(
      sizes.document <= 390 && sizes.body <= 390,
      "page-level overflow " + JSON.stringify(sizes),
    );
    await page.screenshot({
      path: "artifacts/qa/" + r.replace("/", "-") + "-390-interaction.png",
      fullPage: true,
    });
  });
await fs.writeFile(
  "artifacts/qa/interaction-results.json",
  JSON.stringify(
    { results, errors, overflow, browser: browser.version() },
    null,
    2,
  ),
);
console.log(JSON.stringify({ results, errors, overflow }, null, 2));
await browser.close();
if (errors.length || results.some((r) => !r.passed)) process.exitCode = 1;
