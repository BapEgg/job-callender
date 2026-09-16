import { chromium } from "@playwright/test";
import crypto from "node:crypto";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const errors = [];
const checks = [];
const readState = async () =>
  (await page.request.get("http://127.0.0.1:3001/api/state")).json();
const settled = async () => page.waitForTimeout(1100);
const dialog = () => page.getByRole("dialog");
const save = async () => {
  await dialog().getByRole("button", { name: "저장", exact: true }).click();
  await settled();
};
let phase = "signup";
page.on("pageerror", (e) => errors.push(e.message));
const user = "ui-smoke-" + Date.now();
const password = crypto.randomBytes(24).toString("hex");
try {
  await page.goto("http://127.0.0.1:3001/#signup");
  await page.locator("#auth-id").fill(user);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("button", { name: "계정 만들기", exact: true }).click();
  await page.waitForURL("**/#onboarding");
  phase = "home";
  await page.evaluate(() => (location.hash = "home"));
  await page
    .getByRole("heading", { name: "오늘의 준비", exact: true })
    .waitFor();
  if ((await page.locator("body").innerText()).includes("모노페이"))
    throw Error("Fixture leaked");
  phase = "job";
  await page.locator('.sidebar [data-val="jobs"]').click();
  await page
    .getByRole("button", { name: "공고 링크 등록", exact: true })
    .click();
  await page.getByLabel("채용 원문 URL").fill("https://example.org/test-job");
  await page.getByLabel("회사 이름").fill("격리UI시험회사");
  await page.getByLabel("직무 이름").fill("검증개발");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await page.locator('[data-action="start-application"]').click();
  await page.waitForTimeout(1000);
  const data = await (
    await page.request.get("http://127.0.0.1:3001/api/state")
  ).json();
  const id = data.state.apps[0]?.id;
  if (!id) throw Error("Application missing");
  phase = "question";
  await page.evaluate((id) => (location.hash = "write/" + id), id);
  await page
    .getByRole("button", { name: "문항 추가", exact: true })
    .first()
    .click();
  await page.getByLabel("문항 이름").fill("검증 문항");
  await page.getByLabel("문항 원문").fill("직접 확인한 경험을 작성해 주세요.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "저장", exact: true })
    .click();
  await page
    .locator("#draft-editor")
    .fill("직접 수행한 사실과 검증한 한계를 기록합니다.");
  await page.waitForTimeout(1000);
  phase = "reload";
  await page.reload();
  await page.locator("#draft-editor").waitFor();
  if (
    (await page.locator("#draft-editor").inputValue()) !==
    "직접 수행한 사실과 검증한 한계를 기록합니다."
  )
    throw Error("Draft lost");
  phase = "submit";
  await page.evaluate((id) => (location.hash = "submission/" + id), id);
  await page.locator('[data-action="confirm-submit"]').click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "제출본 확정", exact: true }).click();
  await page.waitForTimeout(900);
  const result = await (
    await page.request.get("http://127.0.0.1:3001/api/state")
  ).json();
  if (result.state.apps[0].snapshots.length !== 1)
    throw Error("Snapshot missing");

  phase = "version-restore";
  await page.evaluate((id) => (location.hash = "write/" + id), id);
  await page.locator('[data-action="versions"]').click();
  await page
    .getByRole("button", { name: "현재 글 버전 저장", exact: true })
    .click();
  await dialog().getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator("#draft-editor").fill("복원 전 변경한 합성 시험 초안");
  await settled();
  await page.locator('[data-action="versions"]').click();
  await dialog()
    .getByRole("button", { name: "복원", exact: true })
    .first()
    .click();
  await settled();
  let current = await readState();
  if (
    current.state.apps[0].questions[0].text !==
    "직접 수행한 사실과 검증한 한계를 기록합니다."
  )
    throw Error("Version restore failed");
  if (
    !current.state.apps[0].versions.some(
      (v) => v.text === "복원 전 변경한 합성 시험 초안",
    )
  )
    throw Error("Previous draft lost");
  checks.push("version restore preserves overwritten draft");
  phase = "file-upload";
  await page.evaluate(() => (location.hash = "data"));
  await page
    .getByRole("tab", { name: "등록한 원본 자료", exact: true })
    .click();
  await page.locator('[data-action="add-source"]').click();
  await page
    .getByLabel("자료 이름", { exact: true })
    .fill("합성 파일 보존 시험");
  const fileText =
    "Synthetic UI upload preservation test. No personal information.";
  await page
    .locator("#source-file")
    .setInputFiles({
      name: "synthetic-ui.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileText),
    });
  await save();
  current = await readState();
  const source = current.state.sources.find(
    (s) => s.title === "합성 파일 보존 시험",
  );
  if (!source?.fileId || !source.sha256 || !source.url)
    throw Error("File immutable reference missing");
  const download = await page.request.get("http://127.0.0.1:3001" + source.url);
  if (!download.ok() || (await download.text()) !== fileText)
    throw Error("Uploaded file roundtrip failed");
  checks.push("file upload and authenticated byte roundtrip");
  phase = "source-soft-delete";
  await page.locator('[data-action="delete-source"]').click();
  await dialog()
    .getByRole("button", { name: "목록에서 제외", exact: true })
    .click();
  await settled();
  current = await readState();
  if (!current.state.sources.find((s) => s.id === source.id)?.softDeleted)
    throw Error("Source not preserved as soft delete");
  if (!(await page.request.get("http://127.0.0.1:3001" + source.url)).ok())
    throw Error("Soft delete removed file");
  checks.push("source excluded while source record and file retained");
  phase = "stage-edit";
  await page.evaluate((id) => (location.hash = "workspace/" + id), id);
  await page.locator('[data-action="manage-stages"]').first().click();
  await dialog()
    .getByLabel("단계 이름", { exact: true })
    .first()
    .fill("초기 합성 전형");
  await dialog()
    .getByRole("button", { name: "단계 추가", exact: true })
    .click();
  await dialog()
    .getByLabel("단계 이름", { exact: true })
    .last()
    .fill("두 번째 합성 전형");
  await dialog().getByLabel("위로 이동", { exact: true }).last().click();
  await save();
  current = await readState();
  if (current.state.apps[0].stages[0].name !== "두 번째 합성 전형")
    throw Error("Stage reorder failed");
  await page.reload();
  await page.locator('[data-action="manage-stages"]').first().click();
  if (
    (await dialog()
      .getByLabel("단계 이름", { exact: true })
      .first()
      .inputValue()) !== "두 번째 합성 전형"
  )
    throw Error("Stage persistence failed");
  await dialog().getByRole("button", { name: "닫기", exact: true }).click();
  checks.push("stage add edit reorder and reload");
  phase = "profile-select-import";
  await page.evaluate(() => (location.hash = "data"));
  await page.getByRole("tab", { name: "기본 프로필", exact: true }).click();
  await page.locator("#profile-summary").fill("기본 프로필 합성 소개");
  await page.locator("#profile-skills").fill("Synthetic skill");
  await page.locator('[data-action="save-profile"]').click();
  await settled();
  await page.evaluate((id) => (location.hash = "workspace/" + id), id);
  await page.locator('[data-action="app-profile"]').first().click();
  await page
    .getByLabel("지원별 소개", { exact: true })
    .fill("지원별 미저장 입력 유지");
  await dialog()
    .getByRole("button", { name: "기본 프로필과 비교", exact: true })
    .click();
  await dialog().getByLabel("기술 가져오기", { exact: true }).check();
  await dialog()
    .getByRole("button", {
      name: "선택 항목을 편집 입력으로 가져오기",
      exact: true,
    })
    .click();
  if (
    (await page.getByLabel("지원별 소개", { exact: true }).inputValue()) !==
    "지원별 미저장 입력 유지"
  )
    throw Error("Profile comparison lost draft");
  await save();
  current = await readState();
  if (
    current.state.apps[0].profile.skills !== "Synthetic skill" ||
    current.state.apps[0].profile.summary !== "지원별 미저장 입력 유지" ||
    current.state.profile.summary !== "기본 프로필 합성 소개"
  )
    throw Error("Profile isolation failed");
  if (
    JSON.stringify(current.state.apps[0].snapshots) !==
    JSON.stringify(result.state.apps[0].snapshots)
  )
    throw Error("Immutable submission changed");
  checks.push(
    "selective profile import preserves input base profile and snapshot",
  );
  phase = "connections";
  await page.evaluate(() => (location.hash = "settings"));
  await page.getByText("개인 실행기와 AI", { exact: true }).waitFor();
  const connection = await (
    await page.request.get("http://127.0.0.1:3001/api/connections")
  ).json();
  const expected = connection.capabilities.draft ? "작성 가능" : "미검증";
  if (!(await page.locator("main").innerText()).includes(expected))
    throw Error("Connection status not reflected");
  checks.push("actual connection capability shown");

  phase = "finished";
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa-ui/real-added-features.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      passed: true,
      mode: "real isolated Compose PostgreSQL test3001",
      errors,
      checks,
      jobs: result.state.jobs.length,
      applications: result.state.apps.length,
      questions: result.state.apps[0].questions.length,
      snapshots: result.state.apps[0].snapshots.length,
      submissionRevision: result.revision,
      finalRevision: current.revision,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({ passed: false, phase, errors, error: String(error) }),
  );
  await fs.mkdir("artifacts/qa-ui", { recursive: true });
  await page.screenshot({
    path: "artifacts/qa-ui/real-added-features-failure.png",
    fullPage: true,
  });
  process.exitCode = 1;
} finally {
  await browser.close();
}
