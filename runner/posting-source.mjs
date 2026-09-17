// AI가 말한 모집 상태를 믿지 않고 공개 원문의 상태와 기한을 다시 확인한다.
import { verifiedOpenPosting } from "../server/domain.mjs";

export function wantedUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "www.wanted.co.kr" ||
    u.port ||
    u.username ||
    u.password ||
    !/^\/wd\/\d+$/.test(u.pathname) ||
    u.search ||
    u.hash
  )
    throw Error("UNSUPPORTED_SOURCE");
  return u;
}

export function parseWantedSource(
  html,
  url,
  conditions = {},
  now = new Date(),
) {
  const u = wantedUrl(url);
  const raw = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  const d = raw && JSON.parse(raw).props?.pageProps?.initialData;
  if (!d || String(d.id) !== u.pathname.split("/").at(-1))
    throw Error("SOURCE_UNREADABLE");
  if (
    d.status !== "active" ||
    d.hidden !== false ||
    d.is_private === true ||
    d.close_time
  )
    throw Error("SOURCE_NOT_OPEN");
  if (!d.company?.company_name || !d.position || !d.address?.location)
    throw Error("SOURCE_INCOMPLETE");
  const ld = [
    ...html.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ]
    .flatMap((m) => {
      const x = JSON.parse(m[1]);
      return Array.isArray(x) ? x : x["@graph"] || [x];
    })
    .filter((x) => x["@type"] === "JobPosting");
  const dates = [d.due_time, ...ld.map((x) => x.validThrough)]
    .filter(Boolean)
    .map((date) => {
      if (
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
          date,
        )
      )
        throw Error("SOURCE_DATE_INVALID");
      const day = date.slice(0, 10);
      const parsedDay = new Date(`${day}T00:00:00Z`);
      if (
        !Number.isFinite(+parsedDay) ||
        parsedDay.toISOString().slice(0, 10) !== day
      )
        throw Error("SOURCE_DATE_INVALID");
      if (date.includes("T")) {
        const instant = new Date(
          /[Zz]|[+-]\d{2}:\d{2}$/.test(date) ? date : `${date}+09:00`,
        );
        if (!Number.isFinite(+instant)) throw Error("SOURCE_DATE_INVALID");
        // 출처의 UTC/offset 시각도 앱에서 사용하는 한국 시각으로 맞춘다.
        return new Date(+instant + 9 * 3600000).toISOString().slice(0, 19);
      }
      return date;
    });
  for (const date of dates) {
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date))
      throw Error("SOURCE_DATE_INVALID");
    const asJob = {
      deadline: date.slice(0, 10),
      time: date.includes("T") ? date.slice(11, 16) : "",
      closeType: "fixed",
      currentStatus: "open",
      statusEvidence: "source",
      verifiedAt: now.toISOString(),
    };
    if (!verifiedOpenPosting(asJob, now)) throw Error("SOURCE_DEADLINE_PASSED");
  }
  if (new Set(dates.map((x) => x.slice(0, 10))).size > 1)
    throw Error("SOURCE_DATE_CONFLICT");
  if (new Set(dates.filter((x) => x.includes("T"))).size > 1)
    throw Error("SOURCE_DATE_CONFLICT");
  if (
    conditions.career === "신입" &&
    (d.career?.is_newbie !== true || d.career?.annual_from !== 0)
  )
    throw Error("CAREER_MISMATCH");
  if (
    conditions.career &&
    !["신입", "경력 무관", "경력무관"].includes(conditions.career)
  )
    throw Error("CAREER_REVIEW_REQUIRED");
  if (
    conditions.employment &&
    !(conditions.employment === "정규직" && d.employment_type === "regular")
  )
    throw Error("EMPLOYMENT_MISMATCH");
  const regions = String(conditions.region || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    regions.length &&
    !regions.includes("전국") &&
    !regions.includes(d.address.location)
  )
    throw Error("REGION_MISMATCH");
  // 의미를 임의로 확대하지 않는다. 아직 지원하지 않는 직무/제외 조건은 검토가 필요하다.
  const role = String(conditions.role || "").trim();
  if (
    role &&
    (!/백엔드|서버|backend|back.end/i.test(role) ||
      !/백엔드|서버|backend|back.end/i.test(d.position))
  )
    throw Error("ROLE_REVIEW_REQUIRED");
  if (String(conditions.exclusions || "").trim())
    throw Error("CONDITION_REVIEW_REQUIRED");
  const body = [
    d.position,
    d.requirements,
    d.main_tasks,
    d.preferred_points,
  ].join("\n");
  const skills = [
    "Java",
    "Kotlin",
    "Golang",
    "Spring Boot",
    "PostgreSQL",
    "Redis",
    "MongoDB",
    "Docker",
    "Git",
    "Python",
    "Node.js",
  ].filter((s) =>
    new RegExp(
      `(?<![a-z])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`,
      "i",
    ).test(body),
  );
  const date = dates.find((x) => x.includes("T")) || dates[0];
  return {
    company: d.company.company_name,
    title: d.position,
    url: u.href,
    posted: ld[0]?.datePosted?.slice(0, 10) || null,
    deadline: date?.slice(0, 10) || null,
    time: date?.includes("T") ? date.slice(11, 16) : "",
    closeType: date ? "fixed" : "unknown",
    exp: d.career?.is_newbie ? "신입 지원 가능" : "경력 조건 원문 확인",
    region: [d.address.location, d.address.district].filter(Boolean).join(" "),
    skills,
    source: "원티드",
    type: d.employment_type === "regular" ? "정규직" : "원문 확인",
    summary: `${d.career?.is_newbie ? "신입 지원 가능. " : ""}${skills.length ? `원문 확인 기술: ${skills.join(", ")}. ` : ""}${date ? "접수 기한 원문 확인." : "모집 중 상태 확인, 마감일 미기재."}`,
    currentStatus: "open",
    statusConflict: false,
    verifiedAt: now.toISOString(),
    statusEvidence:
      "원문 status=active, hidden=false, close_time 없음; 명시 기한 경과 없음",
    verificationMode: "public-source-structured-data",
  };
}

export async function verifyWantedSource(
  url,
  conditions,
  signal,
  fetcher = fetch,
) {
  wantedUrl(url);
  const abort = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
  const response = await fetcher(url, { redirect: "error", signal: abort });
  if (!response.ok) throw Error("SOURCE_HTTP_FAILED");
  if (!response.headers.get("content-type")?.includes("text/html"))
    throw Error("SOURCE_NOT_HTML");
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 3_000_000) throw Error("SOURCE_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return parseWantedSource(
    Buffer.concat(chunks).toString("utf8"),
    url,
    conditions,
  );
}
