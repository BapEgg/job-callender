import { randomUUID } from "node:crypto";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function demand(ok, message, status = 400) {
  if (!ok) throw new HttpError(status, message);
}
export function kstDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function countText(text, { spaces = true, unit = "chars" } = {}) {
  const t = spaces ? text : text.replace(/\s/gu, "");
  return unit === "bytes" ? Buffer.byteLength(t, "utf8") : [...t].length;
}
export function deadlineState(job, now = new Date()) {
  if (job.closeType === "rolling")
    return { kind: "rolling", label: "상시채용" };
  if (!job.deadline) return { kind: "unknown", label: "기한 미확인" };
  const today = kstDate(now),
    days = Math.round(
      (Date.parse(job.deadline + "T00:00:00+09:00") -
        Date.parse(today + "T00:00:00+09:00")) /
        86400000,
    );
  const expired =
    days < 0 ||
    !!(job.time && now >= new Date(`${job.deadline}T${job.time}:00+09:00`));
  return {
    kind: expired ? "ended" : days === 0 ? "today" : "open",
    days,
    label: expired
      ? "기재된 접수기간 종료"
      : days === 0
        ? job.time
          ? "오늘 마감"
          : "오늘 마감 · 시간 미확인"
        : `D-${days}`,
  };
}
export function verifiedOpenPosting(job, now = new Date()) {
  if (
    job.currentStatus !== "open" ||
    typeof job.statusEvidence !== "string" ||
    !job.statusEvidence.trim()
  )
    return false;
  if (
    !job.verifiedAt ||
    !Number.isFinite(Date.parse(job.verifiedAt)) ||
    kstDate(new Date(job.verifiedAt)) !== kstDate(now)
  )
    return false;
  // A past explicit deadline wins over a stale 'rolling' label.
  if (job.deadline) {
    const deadline = deadlineState({ ...job, closeType: "fixed" }, now);
    if (deadline.kind === "ended" || !Number.isFinite(deadline.days))
      return false;
  }
  return !job.statusConflict;
}
export function deadlineNotifications(state, now = new Date()) {
  return state.apps.flatMap((app) => {
    const job = state.jobs.find((j) => j.id === app.jobId);
    if (
      !job ||
      app.snapshots?.length ||
      ["submitted", "inprocess", "closed"].includes(app.status)
    )
      return [];
    const d = deadlineState(job, now);
    if (!["today", "open"].includes(d.kind) || ![0, 1].includes(d.days))
      return [];
    return [
      {
        key: `deadline:${app.id}:${job.deadline}:${job.time || "unknown"}:${kstDate(now)}`,
        applicationId: app.id,
        company: job.company,
        title: job.title,
        url: job.manualURL || job.url,
        days: d.days,
        timeUnknown: !job.time,
      },
    ];
  });
}
export function blankState(username) {
  return {
    version: 1,
    profile: {
      name: username,
      role: "",
      summary: "",
      skills: "",
      portfolio: "",
      github: "",
      blog: "",
      region: "",
      career: "",
      employment: "",
      exclusions: "",
    },
    jobs: [],
    saved: [],
    apps: [],
    sources: [],
    experiences: [],
    researchSaved: [],
    notes: [],
    events: [],
    settings: {
      runner: false,
      slack: false,
      newJobs: true,
      days: [1, 0],
      notify: "after",
      batchDone: false,
      batchFailed: false,
      lastSuccess: "",
      night: "00:00",
      newCount: 0,
    },
    feedback: [],
    onboardStep: 1,
    onboardComplete: false,
    reviewMode: false,
  };
}
export function publicURL(value) {
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[|.*\.local$)/i.test(
        u.hostname,
      )
    );
  } catch {
    return false;
  }
}
function uniqueIds(items) {
  return (
    items.every((v) => v && typeof v.id === "string" && v.id.length <= 100) &&
    new Set(items.map((v) => v.id)).size === items.length
  );
}
function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
function validProfile(profile) {
  return (
    profile &&
    typeof profile === "object" &&
    !Array.isArray(profile) &&
    Object.values(profile).every(
      (v) => typeof v === "string" && v.length <= 50000,
    ) &&
    typeof profile.summary === "string"
  );
}
export function validateState(input, previous) {
  demand(
    input && typeof input === "object" && !Array.isArray(input),
    "자료 형식이 올바르지 않습니다.",
  );
  const result = {};
  for (const key of Object.keys(blankState("")))
    result[key] = structuredClone(input[key] ?? blankState("")[key]);
  for (const key of [
    "jobs",
    "apps",
    "sources",
    "experiences",
    "notes",
    "events",
  ]) {
    demand(
      Array.isArray(result[key]) && result[key].length <= 2000,
      `${key} 자료 수 제한`,
    );
    demand(uniqueIds(result[key]), `${key} 식별자 오류`);
  }
  demand(validProfile(result.profile), "프로필 형식 오류");
  for (const job of result.jobs) {
    demand(
      typeof job.company === "string" && typeof job.title === "string",
      "공고 이름 필요",
    );
    demand(
      ["fixed", "rolling", "unknown"].includes(job.closeType),
      "기한 유형 오류",
    );
    if (job.deadline) demand(validDate(job.deadline), "마감 날짜 오류");
    if (job.time)
      demand(/^([01]\d|2[0-3]):[0-5]\d$/.test(job.time), "마감 시각 오류");
    if (job.manualURL || job.url)
      demand(
        publicURL(job.manualURL || job.url),
        "공개 http/https 공고 링크가 필요합니다.",
      );
  }
  for (const app of result.apps) {
    demand(
      result.jobs.some((j) => j.id === app.jobId),
      "지원의 공고가 없습니다.",
    );
    demand(
      ["interest", "preparing", "submitted", "inprocess", "closed"].includes(
        app.status,
      ),
      "지원 상태 오류",
    );
    demand(
      Array.isArray(app.questions) && app.questions.length <= 100,
      "문항 형식 오류",
    );
    demand(uniqueIds(app.questions), "문항 식별자 오류");
    for (const q of app.questions) {
      demand(
        typeof q.text === "string" &&
          q.text.length <= 100000 &&
          typeof q.prompt === "string",
        "문항 본문 오류",
      );
      demand(
        Number.isInteger(q.min) &&
          Number.isInteger(q.max) &&
          q.min >= 0 &&
          q.max >= q.min &&
          q.max <= 100000,
        "분량 범위 오류",
      );
      demand(
        ["chars", "bytes"].includes(q.unit) && typeof q.spaces === "boolean",
        "분량 단위 오류",
      );
    }
    const old = previous.apps.find((a) => a.id === app.id);
    demand(
      JSON.stringify(app.snapshots || []) ===
        JSON.stringify(old?.snapshots || []),
      "제출본은 전용 확정 동작으로만 생성할 수 있습니다.",
      409,
    );
    demand(validProfile(app.profile), "지원별 프로필이 필요합니다.");
    demand(Array.isArray(app.snapshots), "제출본 목록 형식 오류");
    demand(
      Array.isArray(app.stages) &&
        app.stages.length <= 100 &&
        uniqueIds(app.stages),
      "전형 단계 형식 오류",
    );
    demand(
      !["submitted", "inprocess"].includes(app.status) ||
        app.snapshots?.length > 0,
      "외부 제출 확인과 제출본 확정이 먼저 필요합니다.",
      409,
    );
  }
  for (const old of previous.apps)
    demand(
      result.apps.some((a) => a.id === old.id),
      "지원 기록은 삭제 대신 종료 상태로 보존하세요.",
      409,
    );
  result.settings = {
    ...previous.settings,
    newJobs: !!result.settings?.newJobs,
    days: [1, 0],
    notify: "after",
    night: "00:00",
  };
  demand(
    Array.isArray(result.saved) &&
      result.saved.every((id) => result.jobs.some((j) => j.id === id)),
    "관심 공고 식별자 오류",
  );
  return result;
}
export function snapshotFor(state, applicationId, now = new Date()) {
  const app = state.apps.find((a) => a.id === applicationId);
  demand(app, "지원 기록이 없습니다.", 404);
  demand(
    app.questions.some((q) => !q.softDeleted && q.text.trim()),
    "제출할 작성 내용이 없습니다.",
  );
  return {
    id: randomUUID(),
    version: (app.snapshots?.length || 0) + 1,
    date: kstDate(now),
    confirmedAt: now.toISOString(),
    profile: structuredClone(app.profile),
    questions: structuredClone(app.questions.filter((q) => !q.softDeleted)),
    sources: structuredClone(state.sources.filter((s) => !s.softDeleted)),
    experiences: structuredClone(
      state.experiences.filter(
        (e) => e.confirmed && !e.softDeleted && app.evidence?.[e.id] !== false,
      ),
    ),
    job: structuredClone(state.jobs.find((j) => j.id === app.jobId)),
  };
}
