export function slackText(payload) {
  const clean = (value) =>
    String(value || "").replace(
      /[<>&]/g,
      (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c],
    );
  if (payload.type === "summary")
    return (
      (payload.test
        ? "[연결 시험] 준비실의 Slack 연결 확인입니다. 실제 공고 검색 결과가 아닙니다.\n"
        : "") +
      `공고 갱신: 신규 ${payload.added}건 / 변경 ${payload.changed}건\n` +
      payload.jobs
        .map((j) => `${clean(j.company)} · ${clean(j.title)}\n${clean(j.url)}`)
        .join("\n")
    );
  if (payload.type === "deadline" && [0, 1].includes(payload.days))
    return `${payload.days === 0 ? "오늘 마감" : "D-1"} · ${clean(payload.company)} · ${clean(payload.title)}${payload.timeUnknown ? " · 시간 미확인" : ""}\n${clean(payload.url)}`;
  throw Error("Unsupported Slack notification category");
}
export async function deliver(webhook, payload) {
  const u = new URL(webhook);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "hooks.slack.com" ||
    !u.pathname.startsWith("/services/")
  )
    throw Error("Invalid private Slack webhook");
  try {
    const r = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: slackText(payload),
        unfurl_links: false,
        unfurl_media: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    return r.ok && (await r.text()).trim() === "ok" ? "sent" : "failed";
  } catch {
    return "uncertain";
  }
}
