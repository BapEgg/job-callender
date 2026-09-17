// Source-faithful JSX port of approved screen markup. No HTML parsing occurs at runtime.

import { profileOptions } from "./profile-options";
import { JobTable } from "./state";
import { Icon } from "./icons";
import { Children, Fragment } from "react";
import type { ReactNode } from "react";
export function createScreens(
  S: any,
  UI: any,
  act: any,
  onInput: any,
  form: any,
  TODAY: any,
  fixture: any,
) {
  let jsxKey = 0;
  const keyed = (v: any) => (Array.isArray(v) ? Children.toArray(v) : v);
  const route = () => UI.route.split("/");
  const getJob = (id: any) => S.jobs.find((j: any) => j.id === id);
  const getApp = (id: any) => S.apps.find((a: any) => a.id === id);
  const getQuestion = (a: any) =>
    a.questions.find((q: any) => q.id === UI.questionId) || a.questions[0];
  const clone = structuredClone;
  const esc = (v: any) => String(v ?? "");
  const dateShort = (s: any) =>
    s ? String(s).slice(5).replace("-", ".") : "미확인";
  const dateFull = (s: any) =>
    s ? String(s).replaceAll("-", ".") : "기한 미확인";
  const daysUntil = (d: any) =>
    Math.round(
      (new Date(d + "T12:00:00+09:00").getTime() -
        new Date(TODAY + "T12:00:00+09:00").getTime()) /
        86400000,
    );
  const icon = (name: any, cls = "") => (
    <Icon
      name={name}
      small={cls === "sm"}
      size={cls === "lg" ? "lg" : undefined}
    />
  );
  function tag(t: any, c = "") {
    return (
      <Fragment key={jsxKey++}>
        <span className={`tag ${c}`}>{keyed(esc(t))}</span>
      </Fragment>
    );
  }

  function logo(j: any, big = false) {
    return (
      <Fragment key={jsxKey++}>
        <span
          className={`company-logo ${j.color || ""} ${big ? "big" : ""}`}
          aria-hidden={"true"}
        >
          {keyed(esc(j.mark))}
        </span>
      </Fragment>
    );
  }

  function notice(text: any, type = "", ic = "info") {
    return (
      <Fragment key={jsxKey++}>
        <div className={`notice ${type}`}>
          {keyed(icon(ic))}
          <div>{keyed(text)}</div>
        </div>
      </Fragment>
    );
  }

  function panel(title: any, content: any, action: any = "") {
    return (
      <Fragment key={jsxKey++}>
        <section className={"panel"}>
          <div className={"panel-head"}>
            <h2>{keyed(title)}</h2>
            {keyed(action)}
          </div>
          <div className={"panel-body"} style={{ paddingTop: "0" }}>
            {keyed(content)}
          </div>
        </section>
      </Fragment>
    );
  }

  function pageHead(
    title: any,
    sub: any = "",
    actions: any = "",
    eyebrow = "",
  ) {
    return (
      <Fragment key={jsxKey++}>
        <header className={"page-head"}>
          <div>
            {keyed(
              eyebrow ? (
                <Fragment key={jsxKey++}>
                  <p className={"eyebrow"}>{keyed(esc(eyebrow))}</p>
                </Fragment>
              ) : (
                ""
              ),
            )}
            <h1>{keyed(esc(title))}</h1>
            {keyed(
              sub ? (
                <Fragment key={jsxKey++}>
                  <p className={"subtitle"}>{keyed(sub)}</p>
                </Fragment>
              ) : (
                ""
              ),
            )}
          </div>
          {keyed(
            actions ? (
              <Fragment key={jsxKey++}>
                <div className={"head-actions"}>{keyed(actions)}</div>
              </Fragment>
            ) : (
              ""
            ),
          )}
        </header>
      </Fragment>
    );
  }

  function empty(title: any, desc: any, action: any = "", ic = "folder") {
    return (
      <Fragment key={jsxKey++}>
        <div className={"empty"}>
          <div className={"empty-icon"}>{keyed(icon(ic, "lg"))}</div>
          <h3>{keyed(esc(title))}</h3>
          <p>{keyed(desc)}</p>
          {keyed(action)}
        </div>
      </Fragment>
    );
  }

  function btn(text: any, action: any, opts: any = {}) {
    return (
      <button
        type="button"
        className={`btn ${opts.cls || ""}`}
        data-action={action}
        data-id={opts.id}
        data-val={opts.val}
        disabled={opts.disabled}
        title={opts.title}
        aria-label={opts.title}
        onClick={(domEvent) =>
          act(action, opts.id, opts.val, domEvent.currentTarget)
        }
      >
        {opts.icon ? icon(opts.icon, opts.small ? "sm" : "") : null}
        {text ? (
          <span className={opts.hideMobile ? "btn-label" : ""}>{text}</span>
        ) : null}
      </button>
    );
  }
  function goButton(text: any, path: any, cls = "", ic = "") {
    return btn(text, "go", {
      val: path,
      cls,
      icon: ic,
      title: text
        ? ""
        : path.startsWith("job/")
          ? "공고 상세 보기"
          : path === "calendar"
            ? "일정 화면 보기"
            : "화면 이동",
    });
  }
  function field(
    label: any,
    name: any,
    value = "",
    type = "text",
    help: any = "",
    placeholder = "",
  ) {
    const options =
      profileOptions[name.split("-").at(-1) as keyof typeof profileOptions];
    const selected = String(form[name] ?? value)
      .split(/[,，\n]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          type={type}
          value={form[name] ?? value}
          onChange={onInput}
          placeholder={placeholder}
          autoComplete={type === "password" ? "current-password" : "off"}
        />
        {options ? (
          <>
            <span className="field-help">
              여러 개를 선택할 수 있어요. 목록에 없으면 위에 쉼표로 구분해 직접
              입력하세요.
            </span>
            <div
              className="row wrap"
              role="group"
              aria-label={`${label} 선택 목록`}
              style={{ gap: 6 }}
            >
              {options.map((option) => {
                const active = selected.includes(option.toLowerCase());
                return (
                  <button
                    key={option}
                    type="button"
                    className={`btn small ${active ? "primary" : ""}`}
                    aria-pressed={active}
                    onClick={() => act("toggle-profile-option", name, option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </>
        ) : help ? (
          <span className="field-help">{help}</span>
        ) : null}
      </div>
    );
  }
  function textareaField(
    label: any,
    name: any,
    value = "",
    help: any = "",
    rows = 4,
  ) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <textarea
          id={name}
          name={name}
          rows={rows}
          value={form[name] ?? value}
          onChange={onInput}
        />
        {help ? <span className="field-help">{help}</span> : null}
      </div>
    );
  }
  function option(value: any, label: any, current: any) {
    return (
      <option key={value} value={value}>
        {label}
      </option>
    );
  }
  function selectField(label: any, name: any, options: any, current: any) {
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <select
          id={name}
          name={name}
          value={form[name] ?? current}
          onChange={onInput}
        >
          {options.map((o: any) => option(o[0], o[1], current))}
        </select>
      </div>
    );
  }
  function appStatus(s: any) {
    return (
      (
        {
          interest: "관심",
          preparing: "준비 중",
          submitted: "제출 완료",
          inprocess: "전형 진행",
          closed: "종료",
        } as Record<string, string>
      )[s] || s
    );
  }

  function appStatusColor(s: any) {
    return (
      (
        {
          interest: "",
          preparing: "amber",
          submitted: "blue",
          inprocess: "green",
          closed: "",
        } as Record<string, string>
      )[s] || ""
    );
  }

  function deadlineInfo(j: any) {
    if (j.closeType === "rolling")
      return {
        label: "상시채용",
        short: "상시",
        cls: "green",
        detail: "채용 시 조기 종료될 수 있음",
      };
    if (!j.deadline)
      return {
        label: "기한 미확인",
        short: "미확인",
        cls: "",
        detail: "상시채용으로 간주하지 않음",
      };
    const n = daysUntil(j.deadline);
    const expired =
      n < 0 ||
      (!fixture &&
        !!j.time &&
        Date.now() >= Date.parse(`${j.deadline}T${j.time}:00+09:00`));
    return {
      label: expired
        ? fixture
          ? "접수기간 종료"
          : "기재된 접수기간 종료"
        : n === 0
          ? !fixture && !j.time
            ? "오늘 마감 · 시간 미확인"
            : "오늘 마감"
          : `D-${n}`,
      short: expired ? "기간 종료" : n === 0 ? "D-day" : `D-${n}`,
      cls: expired ? "" : n <= 3 ? "amber" : "",
      detail: dateFull(j.deadline) + (j.time ? " " + j.time : " · 시간 미확인"),
    };
  }

  function countText(q: any, text = q.text) {
    const t = q.spaces ? text : text.replace(/\s/g, "");
    return q.unit === "bytes"
      ? new TextEncoder().encode(t).length
      : Array.from(t).length;
  }

  function currentEvents() {
    const events = clone(S.events);
    S.apps.forEach((a: any) => {
      const j = getJob(a.jobId);
      if (j?.deadline)
        events.push({
          id: "deadline-" + a.id,
          title: j.company + " · 공고 마감",
          date: j.deadline,
          time: j.time,
          type: "deadline",
          appId: a.id,
          derived: true,
          note: a.snapshots.length
            ? "이미 제출한 지원입니다. 지원 마감 알림은 중단됩니다."
            : "기재된 마감일 기준입니다. 조기 종료와 연장은 원문에서 확인하세요.",
        });
      if (a.goal)
        events.push({
          id: "goal-" + a.id,
          title: j.company + " · 개인 지원 목표",
          date: a.goal,
          time: "",
          type: "personal",
          appId: a.id,
          derived: true,
          note: "회사 마감일이 아닌 개인이 정한 목표일입니다.",
        });
      a.stages.forEach((st: any) => {
        if (st.date && st.type !== "document")
          events.push({
            id: "stage-" + a.id + "-" + st.id,
            title: j.company + " · " + st.name,
            date: st.date,
            time: st.time || "",
            type: "stage",
            appId: a.id,
            stageId: st.id,
            derived: true,
            note: st.note || "예시 전형 일정입니다. 실제 채용 안내가 아닙니다.",
          });
      });
    });
    return events.sort((a: any, b: any) =>
      (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")),
    );
  }

  function stageLabel(type: any) {
    return (
      (
        {
          document: "서류",
          coding: "코딩테스트",
          task: "과제",
          interview: "면접",
          hr: "조직적합성",
          other: "기타",
        } as Record<string, string>
      )[type] || type
    );
  }

  function eventLabel(type: any) {
    return (
      (
        {
          deadline: "공고 마감",
          personal: "개인 목표",
          reply: "회신",
          stage: "전형 일정",
        } as Record<string, string>
      )[type] || type
    );
  }

  function navActive() {
    const r = route()[0];
    if (["job", "jobs"].includes(r)) return "jobs";
    if (
      ["applications", "workspace", "write", "submission", "prep"].includes(r)
    )
      return "applications";
    if (["data", "experiences"].includes(r)) return "data";
    return r;
  }

  function jobSources(j: any) {
    if (!fixture)
      return j.manualURL
        ? [
            {
              id: j.id + "-official",
              title: j.company + " 채용 원문",
              kind: "사용자 등록",
              tone: "",
              year: "",
              summary:
                "링크만 등록된 상태입니다. 원문 내용은 별도로 확인해 주세요.",
              link: j.manualURL,
            },
          ]
        : [];
    return [
      {
        id: j.id + "-official",
        title: `${j.company} 공식 채용 안내`,
        kind: "공식 · 예시",
        tone: "green",
        year: "2026",
        summary:
          "지원 자격과 전형 흐름을 먼저 확인할 자료입니다. 실제 원문이 아닌 화면 검토용 예시입니다.",
        link: j.manualURL || `https://example.com/jobs/${j.id}`,
      },
      {
        id: j.id + "-past",
        title: "과거 공고와 요구사항 비교",
        kind: "비교 · 예시",
        tone: "blue",
        year: "2025 → 2026",
        summary:
          "과거와 현재 자료의 차이를 보여주는 자리입니다. 자료가 없으면 변화를 추정하지 않습니다.",
        link: `https://example.com/research/${j.id}/history`,
      },
      {
        id: j.id + "-review",
        title: "백엔드 지원 경험에 관한 글",
        kind: "개인 후기 · 예시",
        tone: "amber",
        year: "2025",
        summary:
          "작성자의 직무와 응시 시점을 확인해야 합니다. 예전 후기를 현재 전형의 확정 정보로 쓰지 않습니다.",
        link: `https://example.com/review/${j.id}`,
      },
    ];
  }

  function sourceRows(j: any) {
    return jobSources(j).map((s) => (
      <Fragment key={jsxKey++}>
        <article className={"source-row"}>
          <div className={"row between wrap"}>
            <span className={"row gap-6"}>
              {keyed(tag(s.kind, s.tone))}
              <span className={"fine"} style={{ fontSize: "10px" }}>
                {keyed(s.year)}
              </span>
            </span>
            {keyed(
              S.researchSaved.includes(s.id)
                ? tag("자료함에 저장됨", "green")
                : "",
            )}
          </div>
          <h3 className={"mt-8"}>{keyed(esc(s.title))}</h3>
          <p>{keyed(esc(s.summary))}</p>
          <div className={"source-actions"}>
            <button
              className={"link-btn"}
              data-action={"source-preview"}
              data-id={s.id}
              onClick={(domEvent) =>
                act("source-preview", s.id, "", domEvent.currentTarget)
              }
            >
              {keyed(icon("external", "sm"))}
              {" 원문 링크 미리보기"}
            </button>
            <button
              className={"link-btn"}
              data-action={"save-research"}
              data-id={s.id}
              onClick={(domEvent) =>
                act("save-research", s.id, "", domEvent.currentTarget)
              }
            >
              {keyed(
                icon(S.researchSaved.includes(s.id) ? "check" : "plus", "sm"),
              )}{" "}
              {keyed(
                S.researchSaved.includes(s.id) ? "저장 취소" : "자료함에 저장",
              )}
            </button>
          </div>
        </article>
      </Fragment>
    ));
  }

  function jobPage(id: any) {
    const j = getJob(id);
    if (!j) return notFound();
    const d = deadlineInfo(j);
    const existing = S.apps.find((a: any) => a.jobId === id);
    let body: ReactNode = null;
    if (UI.detailTab === "summary")
      body = (
        <Fragment key={jsxKey++}>
          <section className={"panel"}>
            <div className={"panel-head"}>
              <h2>{"이 직무에서 하는 일"}</h2>
              {keyed(
                tag(
                  fixture ? "공고 요약 · 예시" : "직접 확인한 원문 요약",
                  "outline",
                ),
              )}
            </div>
            <div className={"panel-body"} style={{ paddingTop: "0" }}>
              <p className={"detail-copy"}>{keyed(esc(j.intro))}</p>
              {fixture ? (
                <ul className={"detail-list mt-12"}>
                  <li>
                    {keyed(icon("check"))}
                    <div>
                      {"웹 서비스의 API와 데이터 처리 기능을 개발합니다."}
                      <p className={"fine mt-8"}>
                        {"이 항목은 기능 확인을 위한 가상의 직무 설명입니다."}
                      </p>
                    </div>
                  </li>
                  <li>
                    {keyed(icon("check"))}
                    <div>
                      {"기존 서비스의 업무 흐름과 오류 상황을 분석합니다."}
                    </div>
                  </li>
                  <li>
                    {keyed(icon("check"))}
                    <div>
                      {"구현한 기능의 동작과 데이터 정합성을 확인합니다."}
                    </div>
                  </li>
                </ul>
              ) : (
                <ul className="detail-list mt-12">
                  <li>
                    <div>
                      상세 담당 업무는 채용 원문에서 확인해 주세요.
                      <p className="fine mt-8">
                        자동 검색·원문 읽기가 완료되기 전에는 업무 내용을
                        추정하지 않습니다.
                      </p>
                    </div>
                  </li>
                </ul>
              )}
              <hr />
              <h3>{"필수와 우대는 다르게 봅니다"}</h3>
              <div className={"row wrap mt-12"}>
                {keyed(j.skills.map((x: any) => tag(x)))}
              </div>
              <p className={"fine mt-12"}>
                {
                  "정확한 필수·우대 구분은 실제 원문을 확인해야 합니다. 이 시안에서는 데이터를 읽어오지 않습니다."
                }
              </p>
            </div>
          </section>
          <section className={"panel mt-20"}>
            <div className={"panel-head"}>
              <h2>{"내 경험과 연결할 부분"}</h2>
              {keyed(
                btn("자세히 보기", "detail-tab", {
                  val: "fit",
                  cls: "text small",
                  icon: "arrow",
                }),
              )}
            </div>
            <div className={"panel-body"} style={{ paddingTop: "0" }}>
              {fixture ? (
                <div className={"detail-list"}>
                  <li>
                    {keyed(icon("checkCircle"))}
                    <div>
                      <strong style={{ fontSize: "13px" }}>
                        {"Spring 서비스와 SQL 흐름 분석"}
                      </strong>
                      <p className={"fine mt-8"}>
                        {"기존 시스템 분석 경험을 연결하는 예시"}
                      </p>
                    </div>
                  </li>
                  <li>
                    {keyed(icon("checkCircle"))}
                    <div>
                      <strong style={{ fontSize: "13px" }}>
                        {"작업 상태와 재처리 설계"}
                      </strong>
                      <p className={"fine mt-8"}>
                        {"PlanMate에서 본인이 판단한 범위를 설명"}
                      </p>
                    </div>
                  </li>
                  <li>
                    {keyed(icon("alert"))}
                    <div>
                      <strong style={{ fontSize: "13px" }}>
                        {"운영 경험과 성능 수치"}
                      </strong>
                      <p className={"fine mt-8"}>
                        {"자료만으로 확인되지 않음 · 성과로 자동 작성하지 않음"}
                      </p>
                    </div>
                  </li>
                </div>
              ) : (
                <div className="detail-list">
                  {S.experiences.filter((e: any) => e.confirmed).length ? (
                    S.experiences
                      .filter((e: any) => e.confirmed)
                      .map((e: any) => (
                        <div className="source-row" key={e.id}>
                          <strong>{e.title}</strong>
                          <p>{e.role}</p>
                          <p>{e.body}</p>
                        </div>
                      ))
                  ) : (
                    <p className="fine">
                      확인된 경험이 없습니다. 마이데이터에서 본인 역할과 수행
                      범위를 확인해 주세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        </Fragment>
      );
    if (UI.detailTab === "fit")
      body = fixture ? (
        <Fragment key={jsxKey++}>
          <section className={"panel"}>
            <div className={"panel-head"}>
              <h2>{"지원 자격과 경험 근거"}</h2>
              {keyed(tag("합격 확률이 아닙니다", "outline"))}
            </div>
            <div className={"panel-body"} style={{ paddingTop: "0" }}>
              {keyed(
                notice(
                  "점수 하나로 판단하지 않습니다. 필수 조건, 경험 근거, 개인 선호를 따로 확인합니다.",
                ),
              )}
              <div className={"table-wrap mt-16"}>
                <table className={"job-table"} style={{ minWidth: "440px" }}>
                  <thead>
                    <tr>
                      <th>{"확인할 항목"}</th>
                      <th>{"현재 자료"}</th>
                      <th>{"판단"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{"경력 조건"}</td>
                      <td>{keyed(esc(j.exp))}</td>
                      <td>{keyed(tag("사용자 확인 필요", "amber"))}</td>
                    </tr>
                    <tr>
                      <td>{"Java / Spring"}</td>
                      <td>{"실무·프로젝트 설명"}</td>
                      <td>{keyed(tag("관련 경험 있음", "green"))}</td>
                    </tr>
                    <tr>
                      <td>{"SQL / 데이터 처리"}</td>
                      <td>{"기존 시스템 분석"}</td>
                      <td>{keyed(tag("관련 경험 있음", "green"))}</td>
                    </tr>
                    <tr>
                      <td>{"대규모 운영 성과"}</td>
                      <td>{"확인 가능한 수치 없음"}</td>
                      <td>{keyed(tag("근거 부족", "amber"))}</td>
                    </tr>
                    <tr>
                      <td>{"근무지역"}</td>
                      <td>{keyed(esc(j.region))}</td>
                      <td>{keyed(tag("선호 조건과 비교"))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={"fine mt-16"}>
                {
                  "위 판단은 프로토타입의 설명용 예시이며 실제 자격 판정이 아닙니다."
                }
              </p>
              {keyed(
                goButton(
                  "내 경험 확인하기",
                  "experiences",
                  "small mt-16",
                  "arrow",
                ),
              )}
            </div>
          </section>
        </Fragment>
      ) : (
        panel(
          "지원 자격과 경험 근거",
          notice(
            "자격 충족 여부와 경험 적합성을 아직 판정하지 않았습니다. 등록한 경험과 공고 원문을 함께 확인해 주세요.",
          ),
        )
      );
    if (UI.detailTab === "research")
      body = (
        <Fragment key={jsxKey++}>
          <section className={"panel"}>
            <div className={"panel-head"}>
              <h2>{"지원 전략을 위한 자료"}</h2>
              {keyed(tag("요약 → 원문 확인", "outline"))}
            </div>
            <div className={"panel-body"} style={{ paddingTop: "0" }}>
              {keyed(sourceRows(j))}
              <hr />
              <h3>{"회사에서 확인하고 싶은 질문"}</h3>
              <p className={"detail-copy mt-12"}>
                {
                  "신입 개발자가 처음 맡는 업무는 무엇인가요?\\n운영과 신규 개발의 비중은 어떻게 되나요?\\n기술 선택과 코드 리뷰는 어떤 방식으로 진행하나요?"
                }
              </p>
              <p className={"fine mt-12"}>
                {"답이 없는 항목은 면접에서 회사에 물어볼 질문으로 남깁니다."}
              </p>
            </div>
          </section>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        {keyed(goButton("공고 찾기로", "jobs", "ghost small mb-16", "back"))}
        <header className={"page-head"}>
          <div className={"row start gap-16"}>
            {keyed(logo(j, true))}
            <div>
              <div className={"row wrap gap-6"}>
                <span className={"fine"}>{keyed(esc(j.company))}</span>
                {keyed(tag(fixture ? "가상의 회사" : "등록된 공고", "outline"))}
              </div>
              <h1 className={"mt-8"}>{keyed(esc(j.title))}</h1>
              <p className={"subtitle"}>
                {keyed(esc(j.region))}
                {" · "}
                {keyed(esc(j.type))}
                {" · "}
                {keyed(esc(j.domain))}
              </p>
            </div>
          </div>
          <div className={"head-actions"}>
            <button
              className={`btn ${S.saved.includes(id) ? "outline-accent" : ""}`}
              data-action={"bookmark"}
              data-id={id}
              aria-pressed={S.saved.includes(id)}
              onClick={(domEvent) =>
                act("bookmark", id, "", domEvent.currentTarget)
              }
            >
              {keyed(icon("bookmark"))}
              {keyed(S.saved.includes(id) ? "관심 저장됨" : "관심 저장")}
            </button>
            {keyed(
              btn(
                existing ? "지원 준비실 열기" : "지원 준비 시작",
                "start-application",
                { id, cls: "primary", icon: "arrow" },
              ),
            )}
          </div>
        </header>
        <div className={"info-grid"}>
          <div>
            <small>{"경력 조건"}</small>
            <strong>{keyed(esc(j.exp))}</strong>
          </div>
          <div>
            <small>{"공고일"}</small>
            <strong>{keyed(dateFull(j.posted))}</strong>
          </div>
          <div>
            <small>{"기재된 기한"}</small>
            <strong>
              {keyed(
                j.deadline
                  ? dateFull(j.deadline) + (j.time ? " " + j.time : "")
                  : j.closeType === "rolling"
                    ? "상시채용"
                    : "확인되지 않음",
              )}
            </strong>
          </div>
          <div>
            <small>{"정보 기준"}</small>
            <strong>{"2026.09.16 · 예시"}</strong>
          </div>
        </div>
        <div className={"tabs"} role={"tablist"} aria-label={"공고 상세 분류"}>
          {keyed(
            [
              ["summary", "공고 요약"],
              ["fit", "내 경험 연결"],
              ["research", "기업 · 참고 자료"],
            ].map(([v, l]) => (
              <Fragment key={jsxKey++}>
                <button
                  className={`tab ${UI.detailTab === v ? "active" : ""}`}
                  role={"tab"}
                  aria-selected={UI.detailTab === v}
                  data-action={"detail-tab"}
                  data-val={v}
                  onClick={(domEvent) =>
                    act("detail-tab", "", v, domEvent.currentTarget)
                  }
                >
                  {keyed(l)}
                </button>
              </Fragment>
            )),
          )}
        </div>
        <div className={"cols-main"}>
          <div>{keyed(body)}</div>
          <aside>
            <section className={"panel deadline-card"}>
              <span className={"fine"}>{"지원 일정을 먼저 확인하세요"}</span>
              <div
                className={`deadline-number ${d.cls === "amber" ? "amber" : ""}`}
              >
                {keyed(esc(d.short))}
              </div>
              <p style={{ fontSize: "12px" }}>{keyed(esc(d.detail))}</p>
              <hr />
              <div className={"key-value"}>
                <span>{"원문 출처"}</span>
                <span>
                  {keyed(j.sources)}
                  {"곳 · 예시 링크"}
                </span>
              </div>
              <div className={"key-value"}>
                <span>{"마감 판정"}</span>
                <span>
                  {keyed(
                    j.closeType === "fixed"
                      ? "저장된 날짜 기준"
                      : "원문 확인 필요",
                  )}
                </span>
              </div>
              {keyed(
                btn("공고 원문 보기", "source-job", {
                  id,
                  cls: "w-full mt-16",
                  icon: "external",
                }),
              )}
            </section>
            <div className={"mt-16"}>
              {keyed(
                notice(
                  j.closeType === "rolling"
                    ? "상시채용은 마감일을 임의로 만들지 않습니다. 지원 준비실에서 개인 목표일을 정할 수 있어요."
                    : "기재된 날짜만으로 마감 연장이나 조기 종료는 알 수 없습니다. 제출 직전에 원문을 확인하세요.",
                  "",
                  "clock",
                ),
              )}
            </div>
            <section className={"panel mt-20"}>
              <div className={"panel-body"}>
                <h3>{"어디까지 도와주나요?"}</h3>
                <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                  {
                    "지원할 공고를 선택하면 내 자료를 가져와 자소서와 전형 준비를 이어갑니다. 실제 입사지원은 원래 채용사이트에서 합니다."
                  }
                </p>
              </div>
            </section>
          </aside>
        </div>
      </Fragment>
    );
  }

  function appCards() {
    let apps = S.apps.filter(
      (a: any) => UI.appFilter === "all" || a.status === UI.appFilter,
    );
    if (UI.appSearch)
      apps = apps.filter((a: any) => {
        const j = getJob(a.jobId);
        return (j.company + " " + j.title)
          .toLowerCase()
          .includes(UI.appSearch.toLowerCase());
      });
    if (UI.appView === "board")
      return (
        <Fragment key={jsxKey++}>
          <div className={"board"}>
            {keyed(
              ["interest", "preparing", "submitted", "inprocess", "closed"].map(
                (s) => (
                  <Fragment key={jsxKey++}>
                    <section className={"board-col"}>
                      <div className={"board-head"}>
                        <span>{keyed(appStatus(s))}</span>
                        <span>
                          {keyed(
                            apps.filter((a: any) => a.status === s).length,
                          )}
                        </span>
                      </div>
                      {keyed(
                        apps
                          .filter((a: any) => a.status === s)
                          .map((a: any) => {
                            const j = getJob(a.jobId),
                              d = deadlineInfo(j);
                            return (
                              <Fragment key={jsxKey++}>
                                <button
                                  className={"board-card"}
                                  data-action={"go"}
                                  data-val={`workspace/${a.id}`}
                                  onClick={(domEvent) =>
                                    act(
                                      "go",
                                      "",
                                      `workspace/${a.id}`,
                                      domEvent.currentTarget,
                                    )
                                  }
                                >
                                  <div className={"row between"}>
                                    {keyed(logo(j))}
                                    {keyed(tag(d.short, d.cls))}
                                  </div>
                                  <h3>{keyed(esc(j.company))}</h3>
                                  <p>{keyed(esc(j.title))}</p>
                                  <div className={"row gap-6 mt-12"}>
                                    {keyed(
                                      tag(
                                        a.snapshots.length
                                          ? "제출본 v" + a.snapshots.length
                                          : "초안 작성 중",
                                        a.snapshots.length ? "blue" : "",
                                      ),
                                    )}
                                  </div>
                                </button>
                              </Fragment>
                            );
                          }),
                      )}
                      {keyed(
                        !apps.some((a: any) => a.status === s) ? (
                          <Fragment key={jsxKey++}>
                            <p
                              className={"fine"}
                              style={{
                                fontSize: "11px",
                                textAlign: "center",
                                marginTop: "30px",
                              }}
                            >
                              {"아직 등록된 지원이 없어요."}
                            </p>
                          </Fragment>
                        ) : (
                          ""
                        ),
                      )}
                    </section>
                  </Fragment>
                ),
              ),
            )}
          </div>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        <section className={"panel"}>
          <div className={"table-wrap"}>
            <table className={"job-table"}>
              <thead>
                <tr>
                  <th>{"회사 · 직무"}</th>
                  <th>{"내 지원 상태"}</th>
                  <th>{"다음 일정"}</th>
                  <th>{"작성 · 제출 기록"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keyed(
                  apps.map((a: any) => {
                    const j = getJob(a.jobId),
                      next = currentEvents().find(
                        (e: any) =>
                          e.appId === a.id &&
                          e.date >= TODAY &&
                          e.type !== "deadline",
                      ),
                      d = deadlineInfo(j);
                    return (
                      <Fragment key={jsxKey++}>
                        <tr>
                          <td>
                            <div className={"row"}>
                              {keyed(logo(j))}
                              <div>
                                <button
                                  className={"job-title-btn"}
                                  data-action={"go"}
                                  data-val={`workspace/${a.id}`}
                                  onClick={(domEvent) =>
                                    act(
                                      "go",
                                      "",
                                      `workspace/${a.id}`,
                                      domEvent.currentTarget,
                                    )
                                  }
                                >
                                  {keyed(esc(j.company))}
                                </button>
                                <div
                                  className={"fine"}
                                  style={{ fontSize: "11px", marginTop: "4px" }}
                                >
                                  {keyed(esc(j.title))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {keyed(
                              tag(
                                appStatus(a.status),
                                appStatusColor(a.status),
                              ),
                            )}
                          </td>
                          <td>
                            {keyed(
                              next ? (
                                <Fragment key={jsxKey++}>
                                  <span style={{ fontSize: "12px" }}>
                                    {keyed(dateShort(next.date))}{" "}
                                    {keyed(esc(next.time))}
                                  </span>
                                  <div
                                    className={"fine"}
                                    style={{
                                      fontSize: "10px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    {keyed(
                                      esc(
                                        next.title
                                          .split(" · ")
                                          .slice(1)
                                          .join(" · "),
                                      ),
                                    )}
                                  </div>
                                </Fragment>
                              ) : (
                                <Fragment key={jsxKey++}>
                                  {keyed(tag(d.label, d.cls))}
                                  <div
                                    className={"fine"}
                                    style={{
                                      fontSize: "10px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    {keyed(
                                      j.closeType === "rolling"
                                        ? "개인 목표일 설정 가능"
                                        : "공고의 접수기간 기준",
                                    )}
                                  </div>
                                </Fragment>
                              ),
                            )}
                          </td>
                          <td>
                            {keyed(
                              a.snapshots.length ? (
                                <Fragment key={jsxKey++}>
                                  <div className={"row gap-6 accent"}>
                                    {keyed(icon("lock", "sm"))}
                                    <span>
                                      {"제출본 v"}
                                      {keyed(a.snapshots.length)}
                                    </span>
                                  </div>
                                  <div
                                    className={"fine"}
                                    style={{
                                      fontSize: "10px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    {"당시 프로필 보관"}
                                  </div>
                                </Fragment>
                              ) : (
                                <Fragment key={jsxKey++}>
                                  <span>
                                    {keyed(
                                      a.questions.filter((q: any) => q.text)
                                        .length,
                                    )}
                                    {"/"}
                                    {keyed(a.questions.length)}
                                    {" 문항 작성 중"}
                                  </span>
                                  <div
                                    className={"progress mt-8"}
                                    style={{ width: "95px" }}
                                  >
                                    <span
                                      style={{
                                        width: `${(100 * a.questions.filter((q: any) => q.text).length) / a.questions.length}%`,
                                      }}
                                    ></span>
                                  </div>
                                </Fragment>
                              ),
                            )}
                          </td>
                          <td>
                            {keyed(
                              goButton(
                                "준비실",
                                "workspace/" + a.id,
                                "small",
                                "arrow",
                              ),
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          {keyed(
            !apps.length
              ? empty(
                  "해당 상태의 지원이 없습니다.",
                  "다른 상태를 선택하거나 공고에서 지원 준비를 시작하세요.",
                  goButton("공고 찾기", "jobs", "small"),
                )
              : "",
          )}
        </section>
      </Fragment>
    );
  }

  function applicationsPage() {
    return (
      <Fragment key={jsxKey++}>
        {keyed(
          pageHead(
            "지원 관리",
            "어디에 무엇을 제출했는지, 다음에 무엇을 해야 하는지 한눈에 확인하세요.",
            goButton("새 지원 찾기", "jobs", "primary", "plus"),
          ),
        )}
        <div className={"row between wrap mb-16"}>
          <div className={"segmented"} aria-label={"지원 관리 보기 방식"}>
            <button
              data-action={"app-view"}
              data-val={"list"}
              className={UI.appView === "list" ? "active" : ""}
              onClick={(domEvent) =>
                act("app-view", "", "list", domEvent.currentTarget)
              }
            >
              {keyed(icon("list", "sm"))}
              {" 목록"}
            </button>
            <button
              data-action={"app-view"}
              data-val={"board"}
              className={UI.appView === "board" ? "active" : ""}
              onClick={(domEvent) =>
                act("app-view", "", "board", domEvent.currentTarget)
              }
            >
              {keyed(icon("grid", "sm"))}
              {" 단계별 보드"}
            </button>
          </div>
          <span className={"fine"}>
            {"지원 이력은 공고가 종료되어도 남아요."}
          </span>
        </div>
        <div className={"tabs"} role={"tablist"} aria-label={"지원 상태"}>
          {keyed(
            [
              ["all", "전체"],
              ["interest", "관심"],
              ["preparing", "준비 중"],
              ["submitted", "제출 완료"],
              ["inprocess", "전형 진행"],
              ["closed", "종료"],
            ].map(([v, l]) => (
              <Fragment key={jsxKey++}>
                <button
                  className={`tab ${UI.appFilter === v ? "active" : ""}`}
                  role={"tab"}
                  aria-selected={UI.appFilter === v}
                  data-action={"app-filter"}
                  data-val={v}
                  onClick={(domEvent) =>
                    act("app-filter", "", v, domEvent.currentTarget)
                  }
                >
                  {keyed(l)}
                  <span className={"mini-count"}>
                    {keyed(
                      v === "all"
                        ? S.apps.length
                        : S.apps.filter((a: any) => a.status === v).length,
                    )}
                  </span>
                </button>
              </Fragment>
            )),
          )}
        </div>
        <div className={"filters"}>
          <label className={"searchbox"} style={{ maxWidth: "350px" }}>
            {keyed(icon("search"))}
            <input
              id={"app-search"}
              placeholder={"지원한 회사나 직무 검색"}
              aria-label={"지원한 회사나 직무 검색"}
              value={esc(UI.appSearch)}
              onChange={onInput}
            />
          </label>
        </div>
        <div id={"application-results"}>{keyed(appCards())}</div>
      </Fragment>
    );
  }

  function workHeader(a: any, active: any) {
    const j = getJob(a.jobId);
    const tabs = [
      ["workspace", "준비 현황", ""],
      ["workspace", "조사자료", "research"],
      ["write", "자기소개서", ""],
      ["submission", "제출 기록", ""],
      ["prep", "전형 준비", ""],
    ];
    return (
      <Fragment key={jsxKey++}>
        <div className={"work-header"}>
          <div className={"row between wrap mb-16"}>
            {keyed(
              goButton("지원 관리로", "applications", "ghost small", "back"),
            )}
            <span className={"fine"}>
              {fixture
                ? "가상의 공고 · 개인 지원 공간"
                : "지원별 개인 준비 공간"}
            </span>
          </div>
          <div className={"row between wrap"}>
            <div className={"work-top"}>
              {keyed(logo(j, true))}
              <div>
                <div className={"row gap-6 wrap"}>
                  {keyed(tag(appStatus(a.status), appStatusColor(a.status)))}
                  <span className={"fine"}>{keyed(esc(j.company))}</span>
                </div>
                <h1 className={"work-title mt-8"}>{keyed(esc(j.title))}</h1>
              </div>
            </div>
            <div className={"row wrap"}>
              {keyed(
                btn("공고 원문", "source-job", {
                  id: j.id,
                  icon: "external",
                  cls: "small",
                }),
              )}
              {keyed(
                btn("이 지원의 프로필", "app-profile", {
                  id: a.id,
                  icon: "user",
                  cls: "small",
                }),
              )}
            </div>
          </div>
          <div className={"row wrap gap-6 mt-16"}>
            <span className={"fine"}>{keyed(esc(j.region))}</span>
            <span className={"muted"}>{"·"}</span>
            {keyed(tag(deadlineInfo(j).label, deadlineInfo(j).cls))}
            <span className={"fine"}>
              {keyed(
                a.snapshots.length
                  ? "제출본 v" + a.snapshots.length + " 보관"
                  : "기본 프로필에서 가져온 지원별 수정본",
              )}
            </span>
          </div>
        </div>
        <nav className={"tabs"} aria-label={"이 지원의 준비 메뉴"}>
          {keyed(
            tabs.map(([r, l, sub]) => {
              const key = sub || r;
              const path = r + "/" + a.id + (sub ? "/" + sub : "");
              return (
                <Fragment key={jsxKey++}>
                  <button
                    className={`tab ${active === key ? "active" : ""}`}
                    data-action={"go"}
                    data-val={path}
                    aria-current={active === key ? "page" : undefined}
                    onClick={(domEvent) =>
                      act("go", "", path, domEvent.currentTarget)
                    }
                  >
                    {keyed(l)}
                    {keyed(
                      r === "write" ? (
                        <Fragment key={jsxKey++}>
                          <span className={"mini-count"}>
                            {keyed(a.questions.length)}
                          </span>
                        </Fragment>
                      ) : (
                        ""
                      ),
                    )}
                  </button>
                </Fragment>
              );
            }),
          )}
        </nav>
      </Fragment>
    );
  }

  function checklist(a: any, items: any, prefix = "") {
    return items.map(([id, title, desc]: any) => {
      const key = prefix + id;
      return (
        <Fragment key={jsxKey++}>
          <div className={`check-row ${a.todo[key] ? "done" : ""}`}>
            <input
              type={"checkbox"}
              id={`todo-${esc(key)}`}
              data-change={"todo"}
              data-id={a.id}
              data-key={esc(key)}
              checked={!!a.todo[key]}
              onChange={onInput}
            />
            <label htmlFor={`todo-${esc(key)}`}>
              {keyed(esc(title))}
              {keyed(
                desc ? (
                  <Fragment key={jsxKey++}>
                    <div
                      className={"fine mt-8"}
                      style={{ fontSize: "10px", textDecoration: "none" }}
                    >
                      {keyed(esc(desc))}
                    </div>
                  </Fragment>
                ) : (
                  ""
                ),
              )}
            </label>
          </div>
        </Fragment>
      );
    });
  }

  function workspacePage(id: any, research = false) {
    const a = getApp(id);
    if (!a) return notFound();
    const j = getJob(a.jobId);
    if (research) {
      const savedNotes = S.notes.filter(
        (n: any) => n.appId === a.id || !n.appId,
      );
      return (
        <Fragment key={jsxKey++}>
          {keyed(workHeader(a, "research"))}
          <div className={"row between wrap mb-16"}>
            <div>
              <h2>{"이 지원을 위해 모은 자료"}</h2>
              <p className={"fine mt-8"}>
                {"원문 링크, 직접 쓴 메모, 외부 AI 답변을 구분해서 모아요."}
              </p>
            </div>
            {keyed(
              btn("자료 · 답변 붙여넣기", "add-note", {
                id: a.id,
                cls: "primary",
                icon: "plus",
              }),
            )}
          </div>
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <div className={"row between"}>
                  <h3>{"살펴볼 자료"}</h3>
                  {keyed(tag("시점과 출처를 함께 확인", "outline"))}
                </div>
                {keyed(sourceRows(j))}
                {keyed(
                  savedNotes.length ? (
                    <Fragment key={jsxKey++}>
                      <hr />
                      <h3>{"내가 추가한 자료"}</h3>
                      {keyed(savedNotes.map((n: any) => noteCard(n)))}
                    </Fragment>
                  ) : (
                    ""
                  ),
                )}
              </div>
            </section>
            <aside>
              <section className={"panel"}>
                <div className={"panel-body"}>
                  <h3>{"링크를 저장한 다음에는"}</h3>
                  <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                    {
                      "외부에서 읽은 내용이나 다른 AI와 정리한 답변을 붙여 넣을 수 있어요. 저장했다는 이유만으로 사실로 확인된 자료가 되지는 않습니다."
                    }
                  </p>
                  <hr />
                  <div className={"row gap-6 wrap"}>
                    {keyed(tag("원문 확인", "green"))}
                    {keyed(tag("내 메모"))}
                    {keyed(tag("외부 AI · 미확인", "amber"))}
                  </div>
                </div>
              </section>
              <section className={"panel mt-16"}>
                <div className={"panel-body"}>
                  <h3>{"아직 확인하지 못한 정보"}</h3>
                  <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                    {"재무자료의 기간과 연결·별도 기준"}
                    <br />
                    {"팀의 실제 업무와 온보딩 방식"}
                    <br />
                    {"과거 후기와 현재 전형의 차이"}
                  </p>
                  <p className={"fine mt-12"}>
                    {"프로토타입은 실제 기업자료를 수집하지 않습니다."}
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </Fragment>
      );
    }
    const done = Object.values(a.todo).filter(Boolean).length;
    return (
      <Fragment key={jsxKey++}>
        {keyed(workHeader(a, "workspace"))}
        <div className={"cols-main"}>
          <div>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"다음으로 할 일"}</h2>
                {keyed(tag(done + "개 확인", "green"))}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                {keyed(
                  checklist(a, [
                    [
                      "requirements",
                      "원문에서 지원 자격과 제출 조건 확인",
                      "중복지원 규칙, 필수 파일, 마감 시간도 확인해요.",
                    ],
                    [
                      "facts",
                      "이 지원에 사용할 경험과 사실 검토",
                      "기본 자료를 수정해도 다른 지원에는 자동 반영되지 않아요.",
                    ],
                    [
                      "questions",
                      "필수 자기소개서 문항 작성",
                      "질문, 최소·최대 분량, 공백 포함 여부를 확인해요.",
                    ],
                    [
                      "final",
                      "외부 사이트에서 최종 제출 내용 확인",
                      "복사 버튼을 눌렀다고 제출 완료로 바뀌지 않아요.",
                    ],
                  ]),
                )}
                <div className={"row wrap mt-20"}>
                  {keyed(
                    goButton(
                      "자기소개서 이어 쓰기",
                      "write/" + a.id,
                      "primary",
                      "edit",
                    ),
                  )}
                  {keyed(
                    goButton("제출 전 확인", "submission/" + a.id, "", "arrow"),
                  )}
                </div>
              </div>
            </section>
            <section className={"panel mt-20"}>
              <div className={"panel-head"}>
                <h2>{"이번 회사의 전형 흐름"}</h2>
                {keyed(
                  btn("단계 편집", "manage-stages", {
                    id: a.id,
                    cls: "text small",
                    icon: "edit",
                  }),
                )}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                <p className={"fine"}>
                  {
                    "회사마다 단계와 순서가 달라요. 받은 안내에 맞춰 수정할 수 있습니다."
                  }
                </p>
                <div className={"stage-line"}>
                  {keyed(
                    a.stages.map((st: any) => (
                      <Fragment key={jsxKey++}>
                        <div
                          className={`stage-dot-wrap ${st.state === "진행" ? "active" : ""}`}
                        >
                          {keyed(esc(st.name))}
                          <div style={{ fontSize: "9px", marginTop: "4px" }}>
                            {keyed(st.date ? dateShort(st.date) : "일정 미정")}
                          </div>
                        </div>
                      </Fragment>
                    )),
                  )}
                </div>
                <div className={"row between wrap mt-24"}>
                  <span className={"fine"}>
                    {keyed(
                      a.snapshots.length
                        ? "실제 제출본을 기준으로 질문을 준비합니다."
                        : "제출 전에는 초안 기반의 연습으로 표시합니다.",
                    )}
                  </span>
                  {keyed(
                    goButton("전형 준비로", "prep/" + a.id, "small", "arrow"),
                  )}
                </div>
              </div>
            </section>
            <section className={"panel mt-20"}>
              <div className={"panel-head"}>
                <h2>{"지원 기록과 메모"}</h2>
                {keyed(
                  btn("메모 추가", "add-note", {
                    id: a.id,
                    cls: "text small",
                    icon: "plus",
                  }),
                )}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                {keyed(
                  S.notes.filter((n: any) => n.appId === a.id).length ? (
                    S.notes.filter((n: any) => n.appId === a.id).map(noteCard)
                  ) : (
                    <Fragment key={jsxKey++}>
                      <p className={"fine"}>
                        {
                          "아직 이 지원에 남긴 메모가 없어요. 회사에 물어볼 질문이나 안내 내용을 남겨보세요."
                        }
                      </p>
                    </Fragment>
                  ),
                )}
              </div>
            </section>
          </div>
          <aside>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <div className={"row between"}>
                  <h3>{"내 지원 상태"}</h3>
                  {keyed(tag("직접 관리", "outline"))}
                </div>
                <select
                  className={"w-full mt-12"}
                  value={a.status}
                  data-change={"app-status"}
                  data-id={a.id}
                  aria-label={"내 지원 상태"}
                  onChange={onInput}
                >
                  {keyed(
                    [
                      ["interest", "관심"],
                      ["preparing", "준비 중"],
                      ["submitted", "제출 완료"],
                      ["inprocess", "전형 진행"],
                      ["closed", "종료"],
                    ].map((o) => option(o[0], o[1], a.status)),
                  )}
                </select>
                <p className={"fine mt-8"} style={{ fontSize: "10px" }}>
                  {"실제 지원 취소나 회사의 결과 변경을 대신하지 않습니다."}
                </p>
                <hr />
                <div className={"key-value"}>
                  <span>{"공고 기한"}</span>
                  <span>
                    {keyed(
                      j.deadline
                        ? dateShort(j.deadline) +
                            " " +
                            (j.time || "시간 미확인")
                        : j.closeType === "rolling"
                          ? "상시채용"
                          : "미확인",
                    )}
                  </span>
                </div>
                <div className={"key-value"}>
                  <span>{"개인 목표일"}</span>
                  <span>{keyed(a.goal ? dateShort(a.goal) : "아직 없음")}</span>
                </div>
                {keyed(
                  btn("개인 목표일 설정", "goal", {
                    id: a.id,
                    cls: "small w-full mt-12",
                    icon: "calendar",
                  }),
                )}
              </div>
            </section>
            <section className={"panel mt-16"}>
              <div className={"panel-body"}>
                <h3>{"이 지원의 프로필"}</h3>
                <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                  {keyed(esc(a.profile.summary.slice(0, 115)))}
                  {keyed(a.profile.summary.length > 115 ? "…" : "")}
                </p>
                <div className={"row wrap gap-6 mt-12"}>
                  {keyed(
                    a.profile.skills
                      .split(",")
                      .slice(0, 3)
                      .map((x: any) => tag(x.trim())),
                  )}
                </div>
                {keyed(
                  btn("이번 지원에서만 수정", "app-profile", {
                    id: a.id,
                    cls: "text small mt-16",
                    icon: "edit",
                  }),
                )}
              </div>
            </section>
            <div className={"mt-16"}>
              {keyed(
                notice(
                  a.snapshots.length
                    ? "제출본 v" +
                        a.snapshots.length +
                        "은 별도로 보관 중입니다. 초안을 수정해도 제출본은 바뀌지 않습니다."
                    : "지원 완료 후 제출본을 남겨두면, 면접 연락을 받았을 때 당시 내용을 바로 확인할 수 있어요.",
                  "",
                  "lock",
                ),
              )}
            </div>
          </aside>
        </div>
      </Fragment>
    );
  }

  function noteCard(n: any) {
    const tone = n.type === "ai" ? "amber" : n.type === "source" ? "green" : "";
    return (
      <Fragment key={jsxKey++}>
        <article className={"source-row"}>
          <div className={"row between wrap"}>
            {keyed(
              tag(
                (
                  {
                    ai: "외부 AI · 미확인",
                    source: "직접 확인한 자료",
                    memo: "내 메모",
                  } as Record<string, string>
                )[n.type] || "내 메모",
                tone,
              ),
            )}
            {keyed(
              btn("", "delete-note", {
                id: n.id,
                cls: "ghost icon-only",
                icon: "trash",
                title: "이 메모 삭제",
              }),
            )}
          </div>
          <h3 className={"mt-8"}>{keyed(esc(n.title))}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{keyed(esc(n.content))}</p>
          {keyed(
            n.url ? (
              <Fragment key={jsxKey++}>
                <button
                  className={"link-btn"}
                  data-action={"note-link"}
                  data-id={n.id}
                  onClick={(domEvent) =>
                    act("note-link", n.id, "", domEvent.currentTarget)
                  }
                >
                  {keyed(icon("link", "sm"))}
                  {" 저장한 링크 확인"}
                </button>
              </Fragment>
            ) : (
              ""
            ),
          )}
        </article>
      </Fragment>
    );
  }

  function writerPage(id: any) {
    const a = getApp(id);
    if (!a) return notFound();
    if (!a.questions.length)
      return (
        <Fragment key={jsxKey++}>
          {workHeader(a, "write")}
          <div className="writer">
            <aside>
              <p className="fine mb-16">0개 문항 · 지원별 초안</p>
              <nav className="question-nav" aria-label="자기소개서 문항">
                {btn("문항 추가", "add-question", {
                  id: a.id,
                  cls: "ghost small w-full",
                  icon: "plus",
                })}
              </nav>
            </aside>
            <section className="editor-panel">
              {empty(
                "작성할 문항을 등록해 주세요.",
                "공고의 문항 원문과 최소·최대 분량을 직접 확인해 등록합니다.",
                btn("문항 추가", "add-question", {
                  id: a.id,
                  cls: "primary",
                  icon: "plus",
                }),
              )}
            </section>
            <aside className="writer-aside">
              <section className="sidebox">
                <h3>이번 문항에 사용할 경험</h3>
                <p className="fine">확인한 경험만 작성 근거로 사용합니다.</p>
              </section>
            </aside>
          </div>
        </Fragment>
      );
    const q = getQuestion(a);
    const cnt = countText(q);
    return (
      <Fragment key={jsxKey++}>
        {keyed(workHeader(a, "write"))}
        <div className={"writer"}>
          <aside>
            <p className={"fine mb-16"}>
              {keyed(a.questions.length)}
              {"개 문항 · 지원별 초안"}
            </p>
            <nav className={"question-nav"} aria-label={"자기소개서 문항"}>
              {keyed(
                a.questions.map((it: any, i: any) => (
                  <Fragment key={jsxKey++}>
                    <button
                      data-action={"select-question"}
                      data-id={it.id}
                      className={q.id === it.id ? "active" : ""}
                      aria-current={q.id === it.id ? "page" : undefined}
                      onClick={(domEvent) =>
                        act(
                          "select-question",
                          it.id,
                          "",
                          domEvent.currentTarget,
                        )
                      }
                    >
                      <div className={"q-no"}>
                        {"QUESTION "}
                        {keyed(String(i + 1).padStart(2, "0"))}
                      </div>
                      <div className={"q-name"}>{keyed(esc(it.title))}</div>
                      <div className={"q-foot"}>
                        {keyed(
                          it.text
                            ? countText(it) +
                                (it.unit === "bytes" ? " bytes" : "자")
                            : "아직 작성하지 않음",
                        )}
                      </div>
                    </button>
                  </Fragment>
                )),
              )}
              {keyed(
                btn("문항 추가", "add-question", {
                  id: a.id,
                  cls: "ghost small w-full",
                  icon: "plus",
                }),
              )}
            </nav>
            <div className={"mt-16"}>
              {keyed(
                btn("버전 기록", "versions", {
                  id: a.id,
                  cls: "ghost small",
                  icon: "history",
                }),
              )}
            </div>
          </aside>
          <section>
            <div className={"editor-panel"}>
              <div className={"editor-question"}>
                <div className={"row between mb-16"}>
                  <span className={"eyebrow"} style={{ margin: "0" }}>
                    {"QUESTION "}
                    {keyed(String(a.questions.indexOf(q) + 1).padStart(2, "0"))}
                  </span>
                  {keyed(
                    btn("문항 수정", "edit-question", {
                      id: a.id,
                      cls: "ghost small",
                      icon: "edit",
                    }),
                  )}
                </div>
                <h2>{keyed(esc(q.prompt))}</h2>
                <div className={"row wrap gap-6 mt-12"}>
                  {keyed(
                    tag(
                      `${q.min}–${q.max}${q.unit === "bytes" ? " bytes" : "자"}`,
                      "outline",
                    ),
                  )}
                  {keyed(tag(q.spaces ? "공백 포함" : "공백 제외", "outline"))}
                  {keyed(
                    a.snapshots.length
                      ? tag("제출본과 별도의 작업본", "blue")
                      : tag("초안", "green"),
                  )}
                </div>
              </div>
              <div className={"editor-toolbar"}>
                <span className={"row gap-6"}>
                  {keyed(icon("edit", "sm"))}
                  {" 자유롭게 수정한 뒤 적용할 수 있어요."}
                </span>
                <span
                  className={"row gap-6"}
                  id={"save-state"}
                  role={fixture ? undefined : "button"}
                  tabIndex={fixture ? undefined : 0}
                  aria-label={fixture ? undefined : "AI 작업 상태 보기"}
                  onClick={() => {
                    if (!fixture) act("tasks");
                  }}
                  onKeyDown={(event) => {
                    if (
                      !fixture &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      act("tasks");
                    }
                  }}
                >
                  {keyed(icon("check", "sm"))}
                  {fixture ? " 탭 안에 유지" : " 작업 상태"}
                </span>
              </div>
              <label className={"sr-only"} htmlFor={"draft-editor"}>
                {"자기소개서 답변"}
              </label>
              <textarea
                id={"draft-editor"}
                className={"editor-area"}
                data-app={a.id}
                data-q={q.id}
                spellCheck={false}
                placeholder={
                  "직접 작성하거나 ‘예시 초안 생성’으로 검토 흐름을 확인해 보세요."
                }
                onChange={onInput}
                value={keyed(esc(q.text))}
              ></textarea>
              <div className={"editor-bottom"}>
                <span className={"muted"}>
                  {keyed(icon("lock", "sm"))}
                  {" 실제 제출 전 작업본"}
                </span>
                <div className={"row gap-6"}>
                  <strong
                    id={"char-count"}
                    className={`char-count ${cnt >= q.min && cnt <= q.max ? "good" : "bad"}`}
                  >
                    {keyed(cnt)}
                  </strong>
                  <span>
                    {"/ "}
                    {keyed(q.max)}
                    {keyed(q.unit === "bytes" ? " bytes" : "자")}
                  </span>
                  <span
                    id={"char-status"}
                    className={`tag ${cnt >= q.min && cnt <= q.max ? "green" : "amber"}`}
                  >
                    {keyed(
                      cnt < q.min
                        ? "최소 분량 미달"
                        : cnt > q.max
                          ? "최대 분량 초과"
                          : "분량 충족",
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className={"editor-actionbar"}>
              {keyed(
                btn(
                  UI.generating
                    ? fixture
                      ? "예시 생성 중…"
                      : "생성 진행 중…"
                    : fixture
                      ? "예시 초안 생성"
                      : "초안 생성",
                  "generate",
                  {
                    id: a.id,
                    cls: "primary",
                    icon: "spark",
                    disabled: UI.generating,
                  },
                ),
              )}
              {keyed(
                btn("관점별 검토", "review-draft", {
                  id: a.id,
                  icon: "checkCircle",
                }),
              )}
              {keyed(
                btn("답변 복사", "copy-draft", {
                  id: a.id,
                  cls: "ghost",
                  icon: "copy",
                }),
              )}
              <span className={"fine grow right"} style={{ fontSize: "10px" }}>
                {"생성 결과는 비교 후 적용됩니다."}
              </span>
            </div>
            <p className={"fine mt-12"} style={{ fontSize: "10px" }}>
              {fixture
                ? "실제 AI 실행기는 미연결 상태입니다. 초안을 유지하며 실제 모델 호출·전송·과금은 없습니다."
                : "기존 초안은 유지됩니다. 실행기 연결을 확인한 뒤 생성 결과를 비교하고 직접 적용해 주세요."}
            </p>
          </section>
          <aside className={"writer-aside"}>
            <section className={"sidebox"}>
              <div className={"row between"}>
                <h3 style={{ margin: "0" }}>{"이번 문항에 사용할 경험"}</h3>
                {keyed(
                  btn("", "app-profile", {
                    id: a.id,
                    cls: "ghost icon-only",
                    icon: "edit",
                    title: "이 지원의 경험 수정",
                  }),
                )}
              </div>
              {keyed(
                (fixture
                  ? S.experiences
                  : S.experiences.filter((e: any) => e.confirmed)
                )
                  .slice(0, 2)
                  .map((e: any, i: any) => (
                    <Fragment key={jsxKey++}>
                      <label className={"evidence-row"}>
                        <input
                          type={"checkbox"}
                          data-change={"evidence"}
                          data-id={a.id}
                          data-key={e.id}
                          checked={!(a.evidence?.[e.id] === false)}
                          onChange={onInput}
                        />
                        <span>
                          <strong>
                            {keyed(
                              esc(
                                fixture
                                  ? i === 0
                                    ? "PlanMate"
                                    : "기존 시스템 분석"
                                  : e.title,
                              ),
                            )}
                          </strong>
                          <p>{keyed(esc(e.role))}</p>
                          <span
                            className={"tag green"}
                            style={{ fontSize: "9px", marginTop: "7px" }}
                          >
                            {fixture
                              ? "사용자 확인 상태 · 예시"
                              : "사용자 확인 완료"}
                          </span>
                        </span>
                      </label>
                    </Fragment>
                  )),
              )}
              <p
                className={"fine"}
                style={{ fontSize: "10px", marginTop: "9px" }}
              >
                {
                  "선택 상태만 저장하는 시연입니다. 예시 생성문은 자동 개인화되지 않습니다."
                }
              </p>
            </section>
            <section className={"sidebox"}>
              <div className={"row gap-6 amber"}>
                <span>{keyed(icon("alert", "sm"))}</span>
                <h3 style={{ margin: "0", color: "var(--amber)" }}>
                  {"확인할 사실"}
                </h3>
              </div>
              <p className={"fine mt-12"} style={{ lineHeight: "1.9" }}>
                {fixture
                  ? "대규모 운영 트래픽과 성능 개선 수치는 확인되지 않았어요. 실제로 검증한 범위만 작성해 주세요."
                  : "사용자가 확인하지 않은 역할과 수치는 작성 근거로 사용하지 않습니다. 직접 검증한 범위와 한계를 구분해 주세요."}
              </p>
              <hr />
              <h3>{"문체 원칙"}</h3>
              <p className={"fine"} style={{ lineHeight: "1.95" }}>
                {"과장된 성과를 만들지 않기"}
                <br />
                {"기술 나열보다 판단과 근거 쓰기"}
                <br />
                {"내가 설명할 수 있는 표현 사용"}
              </p>
            </section>
          </aside>
        </div>
      </Fragment>
    );
  }

  function submissionPage(id: any) {
    const a = getApp(id);
    if (!a) return notFound();
    const snap = a.snapshots[a.snapshots.length - 1];
    if (!snap)
      return (
        <Fragment key={jsxKey++}>
          {keyed(workHeader(a, "submission"))}
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"제출하기 전, 마지막 확인"}</h2>
                {keyed(tag("외부 사이트에서 직접 지원", "outline"))}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                {keyed(
                  checklist(
                    a,
                    [
                      [
                        "all",
                        "필수 문항이 빠지지 않았는지 확인했습니다.",
                        "작성 완료와 실제 제출 완료는 다릅니다.",
                      ],
                      [
                        "files",
                        "필요한 파일과 링크를 확인했습니다.",
                        "포트폴리오 링크 접근과 제출 형식을 확인해요.",
                      ],
                      [
                        "names",
                        "다른 회사 이름이나 과장된 성과가 없습니다.",
                        "확인된 경험과 수행 범위를 기준으로 점검해요.",
                      ],
                      [
                        "actual",
                        "외부 채용사이트에서 제출할 내용을 확인했습니다.",
                        "이 체크는 실제 사이트에 제출하는 동작이 아닙니다.",
                      ],
                    ],
                    "submit-",
                  ),
                )}
                <hr />
                <h3>{"기록에 함께 남길 내용"}</h3>
                <div className={"row wrap gap-6 mt-12"}>
                  {keyed(tag("현재 자소서 " + a.questions.length + "문항"))}
                  {keyed(tag("이 지원의 프로필"))}
                  {keyed(tag("포트폴리오 버전명"))}
                </div>
                <p className={"fine mt-16"}>
                  {
                    "실제 제출을 마친 후, 최종 내용과 같은지 확인하고 제출 기록을 만드세요. 이후 초안을 수정해도 당시 기록은 유지됩니다."
                  }
                </p>
                {keyed(
                  btn("제출 기록 만들기", "confirm-submit", {
                    id: a.id,
                    cls: "primary mt-20",
                    icon: "lock",
                  }),
                )}
              </div>
            </section>
            <aside>
              {keyed(
                notice(
                  "프로토타입에서는 예시 스냅샷만 만듭니다. 입사지원이나 문서 업로드를 대신하지 않습니다.",
                  "blue",
                  "info",
                ),
              )}
              <section className={"panel mt-16"}>
                <div className={"panel-body"}>
                  <h3>{"작성 상태"}</h3>
                  {keyed(
                    a.questions.map((q: any) => (
                      <Fragment key={jsxKey++}>
                        <div className={"key-value"}>
                          <span>{keyed(esc(q.title))}</span>
                          <span>
                            {keyed(
                              tag(
                                q.text ? "작성 중" : "미작성",
                                q.text ? "" : "amber",
                              ),
                            )}
                          </span>
                        </div>
                      </Fragment>
                    )),
                  )}
                  {keyed(
                    goButton(
                      "작성 화면으로",
                      "write/" + a.id,
                      "w-full small mt-12",
                      "edit",
                    ),
                  )}
                </div>
              </section>
            </aside>
          </div>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        {keyed(workHeader(a, "submission"))}
        <div className={"row between wrap mb-16"}>
          <div>
            <h2>
              {"제출본 v"}
              {keyed(snap.version)}
            </h2>
            <p className={"fine mt-8"}>
              {keyed(dateFull(snap.date))}
              {fixture
                ? " 기록 · 당시 자료가 고정된 예시 스냅샷"
                : " 기록 · 당시 자료가 고정된 제출본"}
            </p>
          </div>
          <div className={"row wrap"}>
            {keyed(
              btn("이전 제출본", "snapshots", {
                id: a.id,
                icon: "history",
                cls: "small",
              }),
            )}
            {keyed(
              btn("새 제출본 기록", "confirm-submit", {
                id: a.id,
                icon: "plus",
                cls: "small",
              }),
            )}
          </div>
        </div>
        {keyed(
          notice(
            "현재 작업본이나 기본 프로필을 바꿔도 아래 제출본은 바뀌지 않습니다. 외부 사이트에서의 제출·수정·철회는 별도로 진행해야 합니다.",
            "green",
            "lock",
          ),
        )}
        <div className={"cols-main mt-20"}>
          <div>
            {keyed(
              snap.questions.map((q: any, i: any) => (
                <Fragment key={jsxKey++}>
                  <section className={`panel ${i ? "mt-20" : ""}`}>
                    <div className={"panel-head"}>
                      <div>
                        <div className={"fine"} style={{ fontSize: "10px" }}>
                          {"QUESTION "}
                          {keyed(String(i + 1).padStart(2, "0"))}
                        </div>
                        <h3 className={"mt-8"}>{keyed(esc(q.title))}</h3>
                      </div>
                      {keyed(
                        tag(
                          countText(q) + (q.unit === "bytes" ? " bytes" : "자"),
                          "outline",
                        ),
                      )}
                    </div>
                    <div className={"panel-body"} style={{ paddingTop: "0" }}>
                      <p className={"fine mb-16"}>{keyed(esc(q.prompt))}</p>
                      <div className={"snapshot-text"}>
                        {keyed(esc(q.text || "제출 당시 내용 없음"))}
                      </div>
                    </div>
                  </section>
                </Fragment>
              )),
            )}
          </div>
          <aside>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <h3>{"함께 보관된 프로필"}</h3>
                <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                  {keyed(esc(snap.profile.summary))}
                </p>
                <div className={"row wrap gap-6 mt-12"}>
                  {keyed(
                    snap.profile.skills
                      .split(",")
                      .slice(0, 4)
                      .map((x: any) => tag(x.trim())),
                  )}
                </div>
                <hr />
                <div className={"row gap-6"}>
                  {keyed(icon("file", "sm"))}
                  <span className={"fine"}>
                    {fixture
                      ? keyed(esc(snap.file))
                      : `제출 당시 자료 ${(snap.sources || []).length}건`}
                  </span>
                </div>
                <p className={"fine mt-8"} style={{ fontSize: "10px" }}>
                  {fixture
                    ? "파일명만 있는 시연입니다. 실제 파일 내용은 저장하지 않습니다."
                    : "제출 당시의 자료를 보관합니다. 이후 원본 목록과 작업본을 수정해도 아래 참조는 유지됩니다."}
                </p>
                {!fixture &&
                  (snap.sources || []).map((source: any) => (
                    <div className="source-actions" key={source.id}>
                      {source.fileId ? (
                        <a
                          href={`/api/files/${encodeURIComponent(source.fileId)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.title} {icon("download", "sm")}
                        </a>
                      ) : (
                        <span className="fine">
                          {source.title} · 링크 등록 자료
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </section>
            <section className={"panel mt-16"}>
              <div className={"panel-body"}>
                <h3>{"이제 전형 준비로"}</h3>
                <p className={"fine mt-12"} style={{ lineHeight: "1.9" }}>
                  {"내가 제출한 주장과 경험에서 이어질 질문을 준비해 보세요."}
                </p>
                {keyed(
                  goButton(
                    "제출본으로 전형 준비",
                    "prep/" + a.id,
                    "primary w-full mt-16",
                    "arrow",
                  ),
                )}
              </div>
            </section>
          </aside>
        </div>
      </Fragment>
    );
  }

  function stageQuestions(a: any, st: any) {
    return a.stageQA?.[st.id] || a.qa || [];
  }
  function prepPage(id: any) {
    const a = getApp(id);
    if (!a) return notFound();
    const st = a.stages.find((x: any) => x.id === a.activeStage) || a.stages[0];
    if (!st)
      return (
        <Fragment key={jsxKey++}>
          {keyed(workHeader(a, "prep"))}
          {keyed(
            empty(
              "전형 단계를 먼저 추가해 주세요.",
              "회사에서 안내받은 순서와 일정을 등록해 보세요.",
              btn("단계 추가", "manage-stages", {
                id: a.id,
                cls: "primary",
                icon: "plus",
              }),
            ),
          )}
        </Fragment>
      );
    const qa = stageQuestions(a, st);
    let content: ReactNode = null;
    if (UI.prepTab === "questions")
      content = (
        <Fragment key={jsxKey++}>
          <div className={"row between wrap mb-16"}>
            <p className={"fine"}>
              {fixture
                ? "실제 질문 예측이 아니라, 설명할 수 있는지 점검하는 예시입니다."
                : "제출본의 경험을 직접 설명할 수 있는지 점검합니다. 실제 출제 예측이 아닙니다."}
            </p>
            {keyed(
              btn(
                fixture ? "질문 생성 시연" : "제출본 기준 질문 생성",
                "generate-questions",
                { id: a.id, cls: "small", icon: "spark" },
              ),
            )}
          </div>
          {keyed(
            qa.map((q: any, i: any) => (
              <Fragment key={jsxKey++}>
                <article className={"qa-item"}>
                  <div className={"qa-head"}>
                    <button
                      className={"qa-toggle"}
                      data-action={"qa-toggle"}
                      data-id={q.id}
                      aria-expanded={UI.openQA === q.id}
                      onClick={(domEvent) =>
                        act("qa-toggle", q.id, "", domEvent.currentTarget)
                      }
                    >
                      <span className={"qa-no"}>
                        {keyed(String(i + 1).padStart(2, "0"))}
                      </span>
                      <div className={"grow"}>
                        <div className={"qa-title"}>{keyed(esc(q.title))}</div>
                        <p className={"qa-origin"}>{keyed(esc(q.origin))}</p>
                      </div>
                      {keyed(icon(UI.openQA === q.id ? "up" : "down", "sm"))}
                    </button>
                    {keyed(
                      tag(
                        q.level,
                        q.level === "꼬리질문 점검"
                          ? "green"
                          : q.level === "미확인"
                            ? ""
                            : "blue",
                      ),
                    )}
                  </div>
                  {keyed(
                    UI.openQA === q.id ? (
                      <Fragment key={jsxKey++}>
                        <div className={"qa-content"}>
                          <div className={"meta-box"}>
                            <span
                              className={"fine"}
                              style={{ color: "var(--accent)" }}
                            >
                              {"이어질 수 있는 질문"}
                            </span>
                            <p className={"mt-8"}>{keyed(esc(q.follow))}</p>
                          </div>
                          <label
                            className={"fine"}
                            style={{ display: "block", margin: "14px 0 7px" }}
                            htmlFor={`answer-${q.id}`}
                          >
                            {"내 말로 정리한 답변"}
                          </label>
                          <textarea
                            id={`answer-${q.id}`}
                            data-answer={q.id}
                            data-app={a.id}
                            placeholder={
                              "내가 판단하고 검증한 내용을 중심으로 적어보세요."
                            }
                            onChange={onInput}
                            value={keyed(esc(q.answer))}
                          ></textarea>
                          <div className={"row between wrap mt-12"}>
                            <button
                              className={"link-btn"}
                              data-action={"study"}
                              data-id={q.id}
                              onClick={(domEvent) =>
                                act("study", q.id, "", domEvent.currentTarget)
                              }
                            >
                              {keyed(icon("book", "sm"))} {keyed(esc(q.study))}
                            </button>
                            <label className={"row gap-6"}>
                              <span className={"fine"}>{"준비 상태"}</span>
                              <select
                                value={q.level}
                                data-change={"qa-level"}
                                data-id={q.id}
                                data-app={a.id}
                                aria-label={`${esc(q.title)} 준비 상태`}
                                onChange={onInput}
                              >
                                {keyed(
                                  [
                                    "미확인",
                                    "답변 작성",
                                    "직접 설명",
                                    "꼬리질문 점검",
                                  ].map((v) => option(v, v, q.level)),
                                )}
                              </select>
                            </label>
                          </div>
                        </div>
                      </Fragment>
                    ) : (
                      ""
                    ),
                  )}
                </article>
              </Fragment>
            )),
          )}
        </Fragment>
      );
    if (UI.prepTab === "study")
      content = (
        <Fragment key={jsxKey++}>
          <div className={"panel"}>
            <div className={"panel-body"}>
              <h2>{"설명이 막힌 부분을 공부로 연결"}</h2>
              <p className={"fine mt-12"}>
                {
                  "다른 지원에서 같은 개념을 공부했다면 기록을 재사용합니다. 이 화면은 학습 연결 흐름을 보여주는 예시입니다."
                }
              </p>
              {keyed(
                qa.map((q: any) => (
                  <Fragment key={jsxKey++}>
                    <div className={"source-row"}>
                      <div className={"row between wrap"}>
                        <div>
                          <h3>{keyed(esc(q.study))}</h3>
                          <p>{keyed(esc(q.title))}</p>
                        </div>
                        {keyed(
                          btn("학습 메모", "study", {
                            id: q.id,
                            cls: "small",
                            icon: "book",
                          }),
                        )}
                      </div>
                    </div>
                  </Fragment>
                )),
              )}
            </div>
          </div>
        </Fragment>
      );
    if (UI.prepTab === "checklist")
      content = (
        <Fragment key={jsxKey++}>
          <div className={"cols-half"}>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <h3>{"내용 준비"}</h3>
                <div className={"mt-12"}>
                  {keyed(
                    checklist(
                      a,
                      [
                        [
                          "source",
                          "전형 안내와 제출본 확인",
                          "과거 후기와 이번 안내를 구분합니다.",
                        ],
                        [
                          "answer",
                          "설계와 경험을 직접 설명해 보기",
                          "AI가 만든 답변을 읽은 것과 구분합니다.",
                        ],
                        [
                          "question",
                          "회사에 물어볼 질문 준비",
                          "실제 업무, 온보딩, 피드백 방식 등을 정리합니다.",
                        ],
                      ],
                      st.id + "-content-",
                    ),
                  )}
                </div>
              </div>
            </section>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <h3>{"실행 준비"}</h3>
                <div className={"mt-12"}>
                  {keyed(
                    checklist(
                      a,
                      [
                        [
                          "reply",
                          "회신 기한과 접속 링크 확인",
                          "시험일과 회신 마감은 다른 일정입니다.",
                        ],
                        [
                          "env",
                          st.type === "coding"
                            ? "허용 언어와 응시 환경 점검"
                            : "카메라·마이크 또는 방문 장소 확인",
                          "실제 전형 플랫폼의 안내를 확인합니다.",
                        ],
                        [
                          "rule",
                          "참고자료·AI 사용 허용 범위 확인",
                          "확인되지 않은 허용 조건은 추정하지 않습니다.",
                        ],
                      ],
                      st.id + "-exec-",
                    ),
                  )}
                </div>
              </div>
            </section>
          </div>
        </Fragment>
      );
    if (UI.prepTab === "review")
      content = (
        <Fragment key={jsxKey++}>
          <section className={"panel"}>
            <div className={"panel-body"}>
              <h2>{"전형 후에 남기는 짧은 기록"}</h2>
              <p className={"fine mt-8"}>
                {
                  "받은 피드백, 본인의 회고, 추정을 구분해 다음 준비에 사용해요."
                }
              </p>
              <div className={"mt-20"}>
                {keyed(
                  textareaField(
                    "실제로 받은 질문과 다시 준비할 부분",
                    "prep-review",
                    a.review,
                    "불합격 이유를 추정해 사실로 기록하지 않습니다.",
                    8,
                  ),
                )}
              </div>
              {keyed(
                btn("회고 저장", "save-review", {
                  id: a.id,
                  cls: "primary",
                  icon: "check",
                }),
              )}
            </div>
          </section>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        {keyed(workHeader(a, "prep"))}
        <div className={"mb-16"}>
          {keyed(
            notice(
              a.snapshots.length ? (
                <Fragment key={jsxKey++}>
                  <strong>
                    {"제출본 v"}
                    {keyed(a.snapshots.length)}
                  </strong>
                  {fixture
                    ? "을 기준으로 하는 준비 화면입니다. 아래 질문은 미리 작성된 예시이며 실제 AI 분석 결과가 아닙니다."
                    : "에 연결된 질문과 학습 메모를 관리합니다. 실제 받은 질문과 예상 질문을 구분해 주세요."}
                </Fragment>
              ) : (
                <Fragment key={jsxKey++}>
                  {"아직 제출본이 없습니다. "}
                  <strong>{"현재 초안을 참고한 연습"}</strong>
                  {
                    "으로 표시합니다. 제출 기록을 만든 뒤 당시 내용과 연결하세요."
                  }
                </Fragment>
              ),
              a.snapshots.length ? "green" : "amber",
              "lock",
            ),
          )}
        </div>
        <div className={"prep-layout"}>
          <aside>
            <div className={"row between mb-16"}>
              <h3>{"이번 채용 절차"}</h3>
              {keyed(
                btn("", "manage-stages", {
                  id: a.id,
                  cls: "ghost icon-only",
                  icon: "edit",
                  title: "전형 단계 편집",
                }),
              )}
            </div>
            <nav className={"timeline-steps"} aria-label={"전형 단계"}>
              {keyed(
                a.stages.map((x: any, i: any) => (
                  <Fragment key={jsxKey++}>
                    <button
                      className={`stage-btn ${st.id === x.id ? "active" : ""}`}
                      data-action={"select-stage"}
                      data-id={x.id}
                      data-val={a.id}
                      onClick={(domEvent) =>
                        act("select-stage", x.id, a.id, domEvent.currentTarget)
                      }
                    >
                      <span className={"stage-circle"}>
                        {keyed(
                          x.state === "완료" ? icon("check", "sm") : i + 1,
                        )}
                      </span>
                      <div>
                        <h3>{keyed(esc(x.name))}</h3>
                        <p>
                          {keyed(
                            x.date
                              ? dateShort(x.date) + " " + esc(x.time || "")
                              : "일정 미정",
                          )}
                          {" · "}
                          {keyed(esc(x.state))}
                        </p>
                      </div>
                    </button>
                  </Fragment>
                )),
              )}
              {keyed(
                btn("단계 추가", "manage-stages", {
                  id: a.id,
                  cls: "ghost small w-full",
                  icon: "plus",
                }),
              )}
            </nav>
            <div className={"mt-16"}>
              {keyed(
                btn("안내 붙여넣기", "paste-invitation", {
                  id: a.id,
                  cls: "small w-full",
                  icon: "message",
                }),
              )}
            </div>
          </aside>
          <section>
            <div className={"row between wrap mb-16"}>
              <div>
                <h2 style={{ fontSize: "21px" }}>
                  {keyed(esc(st.name))}
                  {" 준비"}
                </h2>
                <p className={"fine mt-8"}>
                  {keyed(
                    st.date
                      ? dateFull(st.date) + " " + esc(st.time || "시간 미정")
                      : "아직 안내된 일정이 없습니다.",
                  )}
                </p>
              </div>
              <div className={"row gap-6"}>
                {keyed(tag(stageLabel(st.type), "blue"))}
                <select
                  value={st.state}
                  data-change={"stage-status"}
                  data-id={st.id}
                  data-app={a.id}
                  aria-label={"현재 전형 상태"}
                  style={{ fontSize: "12px", padding: "7px 9px" }}
                  onChange={onInput}
                >
                  {keyed(
                    ["대기", "진행", "완료"].map((v) => option(v, v, st.state)),
                  )}
                </select>
              </div>
            </div>
            <div className={"prep-subtabs"}>
              {keyed(
                [
                  ["questions", "질문 · 답변"],
                  ["study", "학습 연결"],
                  ["checklist", "준비 체크리스트"],
                  ["review", "전형 회고"],
                ].map(([v, l]) =>
                  btn(l, "prep-tab", {
                    val: v,
                    cls:
                      UI.prepTab === v ? "outline-accent small" : "ghost small",
                  }),
                ),
              )}
            </div>
            {keyed(content)}
          </section>
        </div>
      </Fragment>
    );
  }

  function dataPage() {
    const p = S.profile;
    let body: ReactNode = null;
    if (UI.profileTab === "profile")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"기본 프로필"}</h2>
                {keyed(tag("새 지원의 출발점", "green"))}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                <div className={"form-grid"}>
                  {keyed(field("표시 이름", "profile-name", p.name))}
                  {keyed(field("지원 직무", "profile-role", p.role))}
                  <div className={"span2"}>
                    {keyed(
                      textareaField(
                        "나를 설명하는 경험 요약",
                        "profile-summary",
                        p.summary,
                        fixture
                          ? "실제 민감한 개인정보는 입력하지 마세요. 프로토타입 데이터는 브라우저에 저장됩니다."
                          : "기본 프로필은 새 지원의 출발점입니다. 기존 작업본과 제출본은 변경하지 않습니다.",
                        5,
                      ),
                    )}
                  </div>
                  <div className={"span2"}>
                    {keyed(
                      field(
                        "사용 기술",
                        "profile-skills",
                        p.skills,
                        "text",
                        "쉼표로 구분합니다.",
                      ),
                    )}
                  </div>
                  {keyed(
                    field(
                      "포트폴리오 링크",
                      "profile-portfolio",
                      p.portfolio,
                      "url",
                    ),
                  )}
                  {keyed(
                    field("GitHub 링크", "profile-github", p.github, "url"),
                  )}
                  <div className={"span2"}>
                    {keyed(
                      field("기술 블로그 링크", "profile-blog", p.blog, "url"),
                    )}
                  </div>
                </div>
                <hr />
                <h3>{"공고 검색 조건"}</h3>
                <div className={"form-grid mt-16"}>
                  {keyed(
                    selectField(
                      "경력 조건",
                      "profile-career",
                      [
                        ["신입", "신입"],
                        ["신입·주니어", "신입·주니어"],
                      ],
                      p.career,
                    ),
                  )}
                  {keyed(field("희망 지역", "profile-region", p.region))}
                  <div className={"span2"}>
                    {keyed(
                      field(
                        "제외하거나 확인할 조건",
                        "profile-exclusions",
                        p.exclusions,
                      ),
                    )}
                  </div>
                </div>
                <div className={"row wrap mt-20"}>
                  {keyed(
                    btn("기본 프로필 저장", "save-profile", {
                      cls: "primary",
                      icon: "check",
                    }),
                  )}
                  <span className={"fine"}>
                    {"기존 지원별 프로필은 자동으로 바뀌지 않아요."}
                  </span>
                </div>
              </div>
            </section>
            <aside>
              <section className={"panel"}>
                <div className={"panel-body"}>
                  <h3>{"자료는 세 층으로 나눕니다"}</h3>
                  <div className={"source-row"}>
                    <strong style={{ fontSize: "12px" }}>
                      {"01 기본 프로필"}
                    </strong>
                    <p>{"새로운 지원을 준비할 때 재사용합니다."}</p>
                  </div>
                  <div className={"source-row"}>
                    <strong style={{ fontSize: "12px" }}>
                      {"02 지원별 작업본"}
                    </strong>
                    <p>{"회사마다 강조할 경험을 다르게 수정합니다."}</p>
                  </div>
                  <div className={"source-row"}>
                    <strong style={{ fontSize: "12px" }}>
                      {"03 제출 확정본"}
                    </strong>
                    <p>{"제출 당시의 내용을 별도로 보관합니다."}</p>
                  </div>
                </div>
              </section>
              <div className={"mt-16"}>
                {keyed(
                  notice(
                    "프로필의 경험 문장은 설명용 예시입니다. 코드나 링크가 있다고 실제 수행 경험으로 확정하지 않습니다.",
                    "",
                    "info",
                  ),
                )}
              </div>
            </aside>
          </div>
        </Fragment>
      );
    if (UI.profileTab === "sources")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"row between wrap mb-16"}>
            <p className={"fine"}>
              {"원본 자료와 읽기 상태를 따로 관리합니다."}
            </p>
            {keyed(
              btn("자료 등록", "add-source", { cls: "primary", icon: "plus" }),
            )}
          </div>
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-body"} style={{ paddingTop: "4px" }}>
                {keyed(
                  S.sources.map((s: any) => (
                    <Fragment key={jsxKey++}>
                      <article className={"source-file"}>
                        <span className={"file-icon"}>
                          {keyed(
                            icon(
                              s.type === "file" || s.type === "portfolio"
                                ? "file"
                                : "link",
                            ),
                          )}
                        </span>
                        <div className={"grow"}>
                          <div className={"row between wrap"}>
                            <h3 style={{ fontSize: "13px" }}>
                              {keyed(esc(s.title))}
                            </h3>
                            {keyed(
                              tag(
                                s.status,
                                s.status.includes("링크") ? "" : "blue",
                              ),
                            )}
                          </div>
                          <p
                            className={"fine mt-8"}
                            style={{ lineHeight: "1.9" }}
                          >
                            {keyed(esc(s.note))}
                          </p>
                          {keyed(
                            s.url ? (
                              <Fragment key={jsxKey++}>
                                <p
                                  className={"fine mt-8"}
                                  style={{
                                    fontSize: "10px",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {keyed(esc(s.url))}
                                </p>
                              </Fragment>
                            ) : (
                              ""
                            ),
                          )}
                          <div className={"row mt-12"}>
                            {keyed(
                              btn("등록 내용", "source-info", {
                                id: s.id,
                                cls: "text small",
                                icon: "eye",
                              }),
                            )}
                            {keyed(
                              btn("삭제", "delete-source", {
                                id: s.id,
                                cls: "ghost small",
                                icon: "trash",
                              }),
                            )}
                          </div>
                        </div>
                      </article>
                    </Fragment>
                  )),
                )}
              </div>
            </section>
            <aside>
              {keyed(
                notice(
                  <Fragment key={jsxKey++}>
                    {"파일을 선택해도 이 시안은 "}
                    <strong>{"파일명만 저장"}</strong>
                    {
                      "합니다. 내용 업로드, OCR, 저장소 분석은 수행하지 않습니다."
                    }
                  </Fragment>,
                  "blue",
                  "info",
                ),
              )}
              <section className={"panel mt-16"}>
                <div className={"panel-body"}>
                  <h3>{"읽은 자료와 링크는 다릅니다"}</h3>
                  <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                    {
                      "링크 등록만으로 AI가 원문을 읽었다고 표시하지 않습니다. 실제 분석 결과에서 확인할 경험은 별도로 검토합니다."
                    }
                  </p>
                  {keyed(
                    goButton(
                      "경험 검토 화면",
                      "experiences",
                      "small mt-16",
                      "arrow",
                    ),
                  )}
                </div>
              </section>
            </aside>
          </div>
        </Fragment>
      );
    if (UI.profileTab === "notes")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"row between wrap mb-16"}>
            <p className={"fine"}>
              {"개인 메모와 외부 AI 답변을 지원 건에 연결합니다."}
            </p>
            {keyed(
              btn("메모 · 답변 추가", "add-note", {
                cls: "primary",
                icon: "plus",
              }),
            )}
          </div>
          {keyed(
            S.notes.length ? (
              <Fragment key={jsxKey++}>
                <section className={"panel"}>
                  <div className={"panel-body"}>
                    {keyed(S.notes.map(noteCard))}
                  </div>
                </section>
              </Fragment>
            ) : (
              <Fragment key={jsxKey++}>
                <section className={"panel"}>
                  {keyed(
                    empty(
                      "외부에서 정리한 답변도 모아두세요.",
                      "다른 AI의 답변, 블로그를 읽고 쓴 메모, 면접에서 확인하고 싶은 질문을 저장할 수 있습니다.",
                      btn("첫 자료 붙여넣기", "add-note", {
                        cls: "primary",
                        icon: "plus",
                      }),
                      "message",
                    ),
                  )}
                </section>
              </Fragment>
            ),
          )}
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        {keyed(
          pageHead(
            "마이데이터",
            "매번 나를 다시 설명하지 않도록, 기준이 되는 자료를 정리해요.",
            goButton("내 경험 검토", "experiences", "", "layers"),
          ),
        )}
        <div className={"tabs"} role={"tablist"} aria-label={"마이데이터 분류"}>
          {keyed(
            [
              ["profile", "기본 프로필"],
              ["sources", "등록한 원본 자료"],
              ["notes", "메모 · 외부 AI 답변"],
            ].map(([v, l]) => (
              <Fragment key={jsxKey++}>
                <button
                  className={`tab ${UI.profileTab === v ? "active" : ""}`}
                  role={"tab"}
                  aria-selected={UI.profileTab === v}
                  data-action={"profile-tab"}
                  data-val={v}
                  onClick={(domEvent) =>
                    act("profile-tab", "", v, domEvent.currentTarget)
                  }
                >
                  {keyed(l)}
                </button>
              </Fragment>
            )),
          )}
        </div>
        {keyed(body)}
      </Fragment>
    );
  }

  function experiencesPage() {
    return (
      <Fragment key={jsxKey++}>
        {keyed(goButton("마이데이터로", "data", "ghost small mb-16", "back"))}
        {keyed(
          pageHead(
            "내 경험 검토",
            "자료에 나타난 기술과, 내가 실제로 수행한 역할을 구분합니다.",
            btn("경험 추가", "edit-experience", {
              cls: "primary",
              icon: "plus",
            }),
          ),
        )}
        {keyed(
          notice(
            fixture
              ? "아래 카드는 대화에서 정한 구조를 확인하기 위한 예시입니다. ‘확인 완료’도 실제 자료 검증이 아닌 시안 상태입니다."
              : "본인이 수행한 역할과 확인한 결과만 등록해 주세요. 확인되지 않은 수치와 성과는 작성 근거로 사용하지 않습니다.",
            "",
            "info",
          ),
        )}
        <div className={"cols-half mt-20"}>
          {keyed(
            S.experiences.map((e: any) => (
              <Fragment key={jsxKey++}>
                <article className={"experience-card"}>
                  <div className={"row between wrap"}>
                    <div className={"row gap-6"}>
                      {keyed(tag(e.kind))}
                      {keyed(
                        tag(
                          e.confirmed
                            ? fixture
                              ? "사용자 확인 예시"
                              : "사용자 확인 완료"
                            : "확인 필요",
                          e.confirmed ? "green" : "amber",
                        ),
                      )}
                    </div>
                    {keyed(
                      btn("", "edit-experience", {
                        id: e.id,
                        cls: "ghost icon-only",
                        icon: "edit",
                        title: "이 경험 수정",
                      }),
                    )}
                  </div>
                  <h2 className={"mt-16"}>{keyed(esc(e.title))}</h2>
                  <div className={"fine mt-8"}>
                    {"내 역할 · "}
                    {keyed(esc(e.role))}
                  </div>
                  <p className={"experience-text"}>{keyed(esc(e.body))}</p>
                  <div className={"row wrap gap-6"}>
                    {keyed(
                      e.skills
                        .split("·")
                        .map((x: any) => tag(x.trim(), "outline")),
                    )}
                  </div>
                  <hr />
                  <div className={"row between"}>
                    <span className={"fine"}>
                      {"확인한 범위에서만 작성 근거로 사용"}
                    </span>
                    {keyed(
                      btn(
                        e.confirmed ? "확인 취소" : "확인 완료로 표시",
                        "confirm-experience",
                        {
                          id: e.id,
                          cls: e.confirmed
                            ? "ghost small"
                            : "outline-accent small",
                          icon: e.confirmed ? "check" : "checkCircle",
                        },
                      ),
                    )}
                  </div>
                </article>
              </Fragment>
            )),
          )}
          <article
            className={"experience-card"}
            style={{
              borderStyle: "dashed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "230px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <span className={"muted"}>{keyed(icon("plus", "lg"))}</span>
              <h3 className={"mt-12"}>{"새로운 경험을 정리하세요"}</h3>
              <p className={"fine mt-8"}>
                {"역할과 판단, 검증 범위를 함께 기록합니다."}
              </p>
              {keyed(
                btn("경험 직접 등록", "edit-experience", {
                  cls: "small mt-16",
                  icon: "plus",
                }),
              )}
            </div>
          </article>
        </div>
      </Fragment>
    );
  }

  function dateISO(y: any, m: any, d: any) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function calendarGrid() {
    const y = UI.calendarYear,
      m = UI.calendarMonth,
      start = new Date(y, m, 1).getDay(),
      days = new Date(y, m + 1, 0).getDate(),
      prevDays = new Date(y, m, 0).getDate(),
      count = Math.ceil((start + days) / 7) * 7;
    const events = currentEvents().filter(
      (e: any) => UI.calFilter === "all" || e.type === UI.calFilter,
    );
    let html = [];
    for (let i = 0; i < count; i++) {
      let day = i - start + 1,
        other = false,
        yy = y,
        mm = m;
      if (day < 1) {
        day = prevDays + day;
        mm = m - 1;
        other = true;
      } else if (day > days) {
        day -= days;
        mm = m + 1;
        other = true;
      }
      if (mm < 0) {
        yy--;
        mm = 11;
      }
      if (mm > 11) {
        yy++;
        mm = 0;
      }
      const date = dateISO(yy, mm, day);
      const es = events.filter((e: any) => e.date === date);
      html.push(
        <Fragment key={jsxKey++}>
          <div
            className={`cal-day ${other ? "other" : ""} ${UI.selectedDate === date ? "selected" : ""}`}
          >
            <button
              className={`cal-date ${date === TODAY ? "today" : ""}`}
              data-action={"select-date"}
              data-val={date}
              aria-label={`${date} 일정 보기`}
              aria-current={date === TODAY ? "date" : undefined}
              onClick={(domEvent) =>
                act("select-date", "", date, domEvent.currentTarget)
              }
            >
              {keyed(day)}
            </button>
            {keyed(
              es.slice(0, 3).map((e: any) => (
                <Fragment key={jsxKey++}>
                  <button
                    className={`cal-event ${e.type}`}
                    data-action={"event-detail"}
                    data-id={e.id}
                    title={esc(e.title)}
                    onClick={(domEvent) =>
                      act("event-detail", e.id, "", domEvent.currentTarget)
                    }
                  >
                    {keyed(esc(e.title))}
                  </button>
                </Fragment>
              )),
            )}
            {keyed(
              es.length > 3 ? (
                <Fragment key={jsxKey++}>
                  <button
                    className={"fine"}
                    style={{ fontSize: "9px" }}
                    data-action={"select-date"}
                    data-val={date}
                    onClick={(domEvent) =>
                      act("select-date", "", date, domEvent.currentTarget)
                    }
                  >
                    {"+"}
                    {keyed(es.length - 3)}
                    {"개"}
                  </button>
                </Fragment>
              ) : (
                ""
              ),
            )}
          </div>
        </Fragment>,
      );
    }
    return html;
  }

  function selectedDateEvents() {
    const es = currentEvents().filter(
      (e: any) =>
        e.date === UI.selectedDate &&
        (UI.calFilter === "all" || e.type === UI.calFilter),
    );
    return (
      <Fragment key={jsxKey++}>
        <section className={"panel"}>
          <div className={"panel-head"}>
            <h2>
              {keyed(dateShort(UI.selectedDate))}
              {" 일정"}
            </h2>
            {keyed(
              btn("", "add-event", {
                val: UI.selectedDate,
                cls: "ghost icon-only",
                icon: "plus",
                title: "선택한 날짜에 일정 추가",
              }),
            )}
          </div>
          <div className={"panel-body"} style={{ paddingTop: "0" }}>
            {keyed(
              es.length ? (
                es.map((e: any) => (
                  <Fragment key={jsxKey++}>
                    <article className={"day-event"}>
                      {keyed(
                        tag(
                          eventLabel(e.type),
                          e.type === "deadline"
                            ? "amber"
                            : e.type === "personal"
                              ? "green"
                              : "blue",
                        ),
                      )}
                      <h3>{keyed(esc(e.title))}</h3>
                      <p className={"fine"}>
                        {keyed(esc(e.time || "시간 미정"))}
                      </p>
                      {keyed(
                        btn("일정 확인", "event-detail", {
                          id: e.id,
                          cls: "text small mt-8",
                          icon: "arrow",
                        }),
                      )}
                    </article>
                  </Fragment>
                ))
              ) : (
                <Fragment key={jsxKey++}>
                  <p className={"fine"} style={{ padding: "10px 0 20px" }}>
                    {"등록된 일정이 없습니다."}
                  </p>
                </Fragment>
              ),
            )}
          </div>
        </section>
      </Fragment>
    );
  }

  function calendarPage() {
    return (
      <Fragment key={jsxKey++}>
        {keyed(
          pageHead(
            "일정",
            "회사 마감, 개인 목표, 실제 전형 일정을 구분해 관리합니다.",
            btn("일정 추가", "add-event", { cls: "primary", icon: "plus" }),
          ),
        )}
        <div className={"row wrap gap-6 mb-16"}>
          {keyed(
            [
              ["all", "전체"],
              ["deadline", "공고 마감"],
              ["personal", "개인 목표"],
              ["stage", "전형 일정"],
              ["reply", "회신"],
            ].map(([v, l]) =>
              btn(l, "calendar-filter", {
                val: v,
                cls:
                  UI.calFilter === v ? "outline-accent small" : "ghost small",
              }),
            ),
          )}
        </div>
        <div className={"calendar-layout"}>
          <section className={"calendar"}>
            <div className={"calendar-toolbar"}>
              <h2>
                {keyed(UI.calendarYear)}
                {"년 "}
                {keyed(UI.calendarMonth + 1)}
                {"월"}
              </h2>
              <div className={"row gap-6"}>
                {keyed(btn("오늘", "calendar-today", { cls: "small ghost" }))}
                {keyed(
                  btn("", "calendar-prev", {
                    cls: "ghost icon-only",
                    icon: "back",
                    title: "이전 달",
                  }),
                )}
                {keyed(
                  btn("", "calendar-next", {
                    cls: "ghost icon-only",
                    icon: "arrow",
                    title: "다음 달",
                  }),
                )}
              </div>
            </div>
            <div className={"week-labels"}>
              {keyed(
                ["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <Fragment key={jsxKey++}>
                    <span>{keyed(d)}</span>
                  </Fragment>
                )),
              )}
            </div>
            <div className={"calendar-grid"}>{keyed(calendarGrid())}</div>
          </section>
          <aside className={"calendar-aside"}>
            <div>{keyed(selectedDateEvents())}</div>
            <section className={"panel mt-16"}>
              <div className={"panel-body"}>
                <h3>{"상시채용은 개인 목표로"}</h3>
                <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                  {
                    "회사 마감일이 없는 공고에는 임의의 마감일을 만들지 않아요. 지원하고 싶은 날짜를 개인 목표로 정할 수 있습니다."
                  }
                </p>
                {keyed(
                  goButton(
                    "지원 준비실 보기",
                    fixture ? "workspace/a4" : "applications",
                    "small mt-16",
                    "arrow",
                  ),
                )}
                <hr />
                <h3>{"알림은 Slack으로"}</h3>
                <p className={"fine mt-12"}>
                  {
                    "PC가 꺼진 동안에는 발송하지 않고, 다음 연결 시 현재 필요한 알림만 정리하는 설계입니다."
                  }
                </p>
                {keyed(
                  btn("알림 미리보기", "slack-preview", {
                    cls: "text small mt-12",
                    icon: "bell",
                  }),
                )}
              </div>
            </section>
          </aside>
        </div>
      </Fragment>
    );
  }

  function switchHTML(key: any, value: any, label: any) {
    return (
      <Fragment key={jsxKey++}>
        <button
          type={"button"}
          className={`switch ${value ? "on" : ""}`}
          role={"switch"}
          aria-checked={value}
          aria-label={esc(label)}
          data-action={"switch"}
          data-key={key}
          onClick={(domEvent) => act("switch", "", "", domEvent.currentTarget)}
        ></button>
      </Fragment>
    );
  }

  function settingsPage() {
    let body: ReactNode = null;
    if (UI.settingsTab === "connection")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"cols-main"}>
            <div>
              <section className={"panel"}>
                <div className={"panel-head"}>
                  <h2>{"개인 실행기와 AI"}</h2>
                  {keyed(
                    tag(
                      fixture
                        ? "연결 상태 시연"
                        : UI.connections?.runner
                          ? "실행기 응답 확인"
                          : "실행기 미연결",
                      "outline",
                    ),
                  )}
                </div>
                <div className={"panel-body"} style={{ paddingTop: "0" }}>
                  <div className={"setting-row"}>
                    <span className={"connection-mark"}>{"PC"}</span>
                    <div className={"grow"}>
                      <h3>{"개인 실행기"}</h3>
                      <p>
                        {fixture
                          ? "이 스위치는 연결 끊김과 작업 대기를 시연합니다. 실제 PC 상태를 읽지 않습니다."
                          : UI.connections?.lastSeen
                            ? "마지막 응답: " +
                              new Date(UI.connections.lastSeen).toLocaleString(
                                "ko-KR",
                              )
                            : "최근 90초 내 호스트 실행기 응답이 없거나 상태 확인에 실패했습니다."}
                      </p>
                    </div>
                    {keyed(
                      switchHTML(
                        "runner",
                        fixture ? S.settings.runner : !!UI.connections?.runner,
                        fixture
                          ? "개인 실행기 연결 상태 시연"
                          : "개인 실행기 연결 상태",
                      ),
                    )}
                  </div>
                  <div className={"setting-row"}>
                    <span className={"connection-mark"}>{"GPT"}</span>
                    <div className={"grow"}>
                      <h3>{"자기소개서 · 전형 전략"}</h3>
                      <p>
                        {"설정 희망값: GPT-6 Astra / Medium"}
                        <br />
                        {fixture
                          ? "실제 모델 가용성, 로그인, 사용량은 여기서 확인하지 않습니다."
                          : UI.connections?.capabilities?.draft
                            ? "Codex 작성 capability 확인 · 전형 질문: " +
                              (UI.connections?.capabilities?.questions
                                ? "사용 가능"
                                : "미검증") +
                              " · 남은 사용량은 미확인"
                            : "Codex 작성 capability 미확인 · 로그인이나 사용량 상태는 별도 확인이 필요합니다."}
                      </p>
                    </div>
                    {keyed(
                      tag(
                        fixture
                          ? "시연 설정"
                          : UI.connections?.capabilities?.draft
                            ? "작성 가능"
                            : "미검증",
                        fixture || UI.connections?.capabilities?.draft
                          ? "green"
                          : "amber",
                      ),
                    )}
                  </div>
                  <div className={"setting-row"}>
                    <span className={"connection-mark"}>{"G"}</span>
                    <div className={"grow"}>
                      <h3>{"공고 · 관련 자료 검색"}</h3>
                      <p>
                        {"Gemini 구독의 CLI 실행을 연결하는 설계입니다."}
                        <br />
                        {fixture
                          ? "이 프로토타입은 실제 검색 요청을 보내지 않습니다."
                          : UI.connections?.capabilities?.search
                            ? "공개 검색 결과 응답 계약 확인됨 · 요청별 결과는 별도 검증합니다."
                            : "Google 공개 검색의 결과 응답 계약 미검증 또는 실패 · 인증 실패와 구분합니다."}
                      </p>
                    </div>
                    {keyed(
                      tag(
                        fixture
                          ? "시연 설정"
                          : UI.connections?.capabilities?.search
                            ? "검색 가능"
                            : "결과 미검증",
                        fixture || UI.connections?.capabilities?.search
                          ? "green"
                          : "amber",
                      ),
                    )}
                  </div>
                  <div className={"mt-16"}>
                    {keyed(
                      notice(
                        "API 키, 비밀번호, 로그인 토큰은 이 시안에 입력하지 마세요. 추가 결제나 실제 인증을 진행하지 않습니다.",
                        "",
                        "lock",
                      ),
                    )}
                  </div>
                </div>
              </section>
              <section className={"panel mt-20"}>
                <div className={"panel-head"}>
                  <h2>{"Slack 알림"}</h2>
                  {keyed(
                    tag(
                      fixture ? "#job-alerts" : "Slack 미검증",
                      fixture ? "green" : "amber",
                    ),
                  )}
                </div>
                <div className={"panel-body"} style={{ paddingTop: "0" }}>
                  <div className={"setting-row"}>
                    <span className={"connection-mark"}>{"#"}</span>
                    <div className={"grow"}>
                      <h3>{"개인 워크스페이스 / job-alerts"}</h3>
                      <p>
                        {"사용자가 생성한 채널을 가정한 화면입니다."}
                        <br />
                        {"Webhook URL은 입력하거나 보관하지 않습니다."}
                      </p>
                    </div>
                    {keyed(
                      switchHTML(
                        "slack",
                        S.settings.slack,
                        fixture
                          ? "Slack 알림 사용 시연"
                          : "Slack 알림 연결 상태",
                      ),
                    )}
                  </div>
                  <div className={"row wrap mt-16"}>
                    {keyed(
                      btn("메시지 미리보기", "slack-preview", {
                        cls: "small",
                        icon: "eye",
                      }),
                    )}
                    <span className={"fine"}>{"실제 발송 없음"}</span>
                  </div>
                </div>
              </section>
            </div>
            <aside>
              <section className={"panel"}>
                <div className={"panel-body"}>
                  <h3>{"지금 연결된 것은 없습니다"}</h3>
                  <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                    {fixture
                      ? "버튼과 상태 변경은 UI 검토용입니다. 설치한 CLI, PostgreSQL, Docker, Slack과의 연결은 프로토타입 승인 후 별도로 구현합니다."
                      : "DB 저장과 실제 AI·Slack 연결 상태는 별개입니다. 실행기와 Slack이 연결되기 전에는 작업 또는 발송 성공으로 표시하지 않습니다."}
                  </p>
                  <hr />
                  <div className={"key-value"}>
                    <span>{"AI 작업 대기"}</span>
                    <span>
                      {keyed(UI.queued.length)}
                      {"건 · 시연"}
                    </span>
                  </div>
                  <div className={"key-value"}>
                    <span>{"사용 모드"}</span>
                    <span>{"개인용"}</span>
                  </div>
                  <div className={"key-value"}>
                    <span>{"추가 API 결제"}</span>
                    <span>{"사용하지 않음"}</span>
                  </div>
                </div>
              </section>
              <section className={"panel mt-16"}>
                <div className={"panel-body"}>
                  <h3>{"시안 검토 도구"}</h3>
                  {keyed(
                    btn("전체 화면 목록", "screen-map", {
                      cls: "w-full small mt-16",
                      icon: "grid",
                    }),
                  )}
                  {keyed(
                    btn("색상 · 배치 기준", "design-guide", {
                      cls: "w-full small mt-12",
                      icon: "palette",
                    }),
                  )}
                  {keyed(
                    btn("검토 의견 모아 보기", "feedback", {
                      cls: "w-full small mt-12",
                      icon: "message",
                    }),
                  )}
                </div>
              </section>
            </aside>
          </div>
        </Fragment>
      );
    if (UI.settingsTab === "notification")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"알림 내용과 시점"}</h2>
                {keyed(
                  tag(fixture ? "저장만 하는 시연" : "알림 정책", "outline"),
                )}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                <div className={"setting-row"}>
                  <div className={"grow"}>
                    <h3>{"새 맞춤 공고 요약"}</h3>
                    <p>
                      {
                        "같은 공고를 여러 번 알리지 않고, 새로 발견한 결과를 묶습니다."
                      }
                    </p>
                  </div>
                  {keyed(
                    switchHTML(
                      "newJobs",
                      S.settings.newJobs,
                      "새 공고 요약 알림",
                    ),
                  )}
                </div>
                <div className={"setting-row"}>
                  <div className={"grow"}>
                    <h3>{"지원 마감 알림"}</h3>
                    <p>
                      {"제출을 기록한 지원 건에는 공고 마감 알림을 중단합니다."}
                    </p>
                  </div>
                  <div className={"row gap-6 wrap"}>
                    {keyed(
                      [
                        [1, "D-1"],
                        [0, "당일"],
                      ].map(([v, l]) => (
                        <Fragment key={jsxKey++}>
                          <label
                            className={"row gap-6"}
                            style={{ fontSize: "12px" }}
                          >
                            <input
                              type={"checkbox"}
                              data-change={"notify-day"}
                              value={v}
                              checked={S.settings.days.includes(v)}
                              style={{ accentColor: "var(--accent)" }}
                              onChange={onInput}
                            />
                            {keyed(l)}
                          </label>
                        </Fragment>
                      )),
                    )}
                  </div>
                </div>
                <div className={"setting-row"}>
                  <div className={"grow"}>
                    <h3>{"수신 시점"}</h3>
                    <p>
                      {"정확한 예약 발송은 실제 실행 환경에서 별도 검증합니다."}
                    </p>
                  </div>
                  <select
                    id={"notify-time"}
                    aria-label={"알림 수신 시점"}
                    style={{ fontSize: "12px" }}
                    onChange={onInput}
                  >
                    {keyed(option("after", "갱신 완료 후", S.settings.notify))}
                    {keyed(
                      option(
                        "morning",
                        "아침 요약 (검토안)",
                        S.settings.notify,
                      ),
                    )}
                  </select>
                </div>
                <div className={"setting-row"}>
                  <div className={"grow"}>
                    <h3>{"상시채용"}</h3>
                    <p>
                      {
                        "회사 마감 D-day 대신 개인 목표일을 사용합니다. 기한 미확인은 상시채용과 구분합니다."
                      }
                    </p>
                  </div>
                  {keyed(tag("개인 목표 기준", "green"))}
                </div>
                <div className={"mt-16"}>
                  {keyed(
                    notice(
                      "종료·절전 중 지난 알림을 모두 재발송하지 않고, 다시 연결됐을 때 현재 필요한 알림만 계산하는 설계입니다.",
                      "",
                      "clock",
                    ),
                  )}
                </div>
              </div>
            </section>
            <aside>
              {keyed(slackMessage())}
              <p className={"fine mt-12"} style={{ fontSize: "10px" }}>
                {"미리보기입니다. 실제 채널에 게시되지 않습니다."}
              </p>
            </aside>
          </div>
        </Fragment>
      );
    if (UI.settingsTab === "batch")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"cols-main"}>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"매일 확인, 놓쳤으면 다음 연결에"}</h2>
                {keyed(tag("Asia/Seoul", "outline"))}
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                <div className={"key-value"}>
                  <span>{"정기 갱신 기준"}</span>
                  <span>{"매일 00:00 · 한국시간"}</span>
                </div>
                <div className={"key-value"}>
                  <span>{"오늘 실행 상태"}</span>
                  <span>
                    {keyed(
                      UI.batchRunning
                        ? "실행 중"
                        : S.settings.batchDone
                          ? "성공한 상태 · 예시"
                          : S.settings.batchFailed
                            ? "실패한 상태 · 예시"
                            : "아직 미실행 · 예시",
                    )}
                  </span>
                </div>
                <div className={"key-value"}>
                  <span>{"마지막 성공"}</span>
                  <span>{keyed(esc(S.settings.lastSuccess))}</span>
                </div>
                <div className={"key-value"}>
                  <span>{"PC 종료·절전"}</span>
                  <span>{"실행하지 않음"}</span>
                </div>
                <div className={"key-value"}>
                  <span>{"다음 연결"}</span>
                  <span>{"당일 성공 여부 확인 후 1회"}</span>
                </div>
                <div className={"key-value"}>
                  <span>{"기존 공고 마감"}</span>
                  <span>{"저장된 날짜로 판정"}</span>
                </div>
                <hr />
                <h3>{"갱신 상황을 눌러보세요"}</h3>
                <div className={"row wrap mt-16"}>
                  {keyed(
                    btn("오늘 미실행 상태", "batch-scenario", {
                      val: "missed",
                      cls: "small",
                    }),
                  )}
                  {keyed(
                    btn("확인 실패 상태", "batch-scenario", {
                      val: "failed",
                      cls: "small",
                    }),
                  )}
                  {keyed(
                    btn("성공한 상태", "batch-scenario", {
                      val: "done",
                      cls: "small",
                    }),
                  )}
                </div>
                <div className={"row wrap mt-16"}>
                  {keyed(
                    btn(
                      UI.batchRunning ? "모의 실행 중…" : "배치 실행 시연",
                      "run-batch",
                      {
                        cls: "primary",
                        icon: "refresh",
                        disabled: UI.batchRunning,
                      },
                    ),
                  )}
                  {keyed(
                    btn("PC 재연결 시연", "reconnect", {
                      cls: "small",
                      icon: "monitor",
                    }),
                  )}
                </div>
                {keyed(
                  UI.batchRunning ? (
                    <Fragment key={jsxKey++}>
                      <div className={"loading-line mt-16"}>
                        <span></span>
                      </div>
                    </Fragment>
                  ) : (
                    ""
                  ),
                )}
              </div>
            </section>
            <aside>
              {keyed(
                notice(
                  "당일 성공 기록이 있거나 이미 실행 중이면 중복 실행하지 않습니다. 며칠 쉬었다면 과거 날짜별로 반복하지 않고 현재 기준으로 한 번 확인합니다.",
                  "green",
                  "checkCircle",
                ),
              )}
              <div className={"mt-16"}>
                {keyed(
                  notice(
                    "PC를 껐다 켜는 실제 동작은 이 HTML에서 감지하지 않습니다. 버튼은 그 상태 전환을 설명하기 위한 시연입니다.",
                    "",
                    "info",
                  ),
                )}
              </div>
            </aside>
          </div>
        </Fragment>
      );
    if (UI.settingsTab === "data")
      body = (
        <Fragment key={jsxKey++}>
          <div className={"cols-half"}>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <h2>
                  {fixture
                    ? "브라우저에 저장한 시안 데이터"
                    : "개인 자료와 계정"}
                </h2>
                <p className={"fine mt-12"} style={{ lineHeight: "1.95" }}>
                  {fixture
                    ? "프로필, 초안, 제출 기록, 일정, 검토 의견을 이 브라우저에만 저장합니다. 실제 계정 정보는 수집하지 않습니다."
                    : "프로필, 초안, 제출 기록과 일정은 로그인한 계정의 서버 자료로 저장합니다. 저장 실패나 버전 충돌 시 현재 입력을 유지합니다."}
                </p>
                <div className={"row wrap mt-20"}>
                  {keyed(
                    btn("시안 데이터 내보내기", "export-data", {
                      icon: "download",
                      cls: "small",
                    }),
                  )}
                  {keyed(
                    btn(
                      fixture ? "예시로 초기화" : "자료 관리 확인",
                      "reset-demo",
                      { icon: "refresh", cls: "danger small" },
                    ),
                  )}
                </div>
                <p className={"fine mt-12"} style={{ fontSize: "10px" }}>
                  {
                    "초기화하면 이 시안의 입력과 검토 의견이 삭제됩니다. 필요한 내용은 먼저 내보내세요."
                  }
                </p>
              </div>
            </section>
            <section className={"panel"}>
              <div className={"panel-body"}>
                <h2>{"계정 화면도 확인하세요"}</h2>
                <p className={"fine mt-12"}>
                  {fixture
                    ? "회원가입과 로그인은 화면 시연입니다. 실제 인증이나 비밀번호 저장은 하지 않습니다."
                    : "아이디와 비밀번호로 로그인합니다. 비밀번호는 브라우저에 보관하지 않습니다."}
                </p>
                <div className={"row wrap mt-20"}>
                  {keyed(
                    fixture
                      ? goButton("로그인 화면", "login", "small", "lock")
                      : btn("로그아웃", "logout", {
                          cls: "small",
                          icon: "lock",
                        }),
                  )}
                  {keyed(goButton("회원가입 화면", "signup", "small", "user"))}
                  {keyed(
                    goButton("최초 설정", "onboarding", "small", "settings"),
                  )}
                </div>
              </div>
            </section>
          </div>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        {keyed(
          pageHead(
            "설정",
            "연결, 알림, 배치 동작을 확인하고 시안의 예외 상태를 점검하세요.",
          ),
        )}
        <div className={"tabs"} role={"tablist"} aria-label={"설정 분류"}>
          {keyed(
            [
              ["connection", "연결"],
              ["notification", "알림 정책"],
              ["batch", "배치 · 상태 시연"],
              ["data", "데이터 · 계정"],
            ].map(([v, l]) => (
              <Fragment key={jsxKey++}>
                <button
                  className={`tab ${UI.settingsTab === v ? "active" : ""}`}
                  role={"tab"}
                  aria-selected={UI.settingsTab === v}
                  data-action={"settings-tab"}
                  data-val={v}
                  onClick={(domEvent) =>
                    act("settings-tab", "", v, domEvent.currentTarget)
                  }
                >
                  {keyed(l)}
                </button>
              </Fragment>
            )),
          )}
        </div>
        {keyed(body)}
      </Fragment>
    );
  }

  function slackMessage() {
    const due = S.apps.filter(
      (a: any) =>
        a.status !== "closed" &&
        !a.snapshots.length &&
        getJob(a.jobId).deadline &&
        daysUntil(getJob(a.jobId).deadline) >= 0 &&
        daysUntil(getJob(a.jobId).deadline) <= 1,
    );
    return (
      <Fragment key={jsxKey++}>
        <div className={"slack-preview"}>
          <span className={"bot"}>{"준"}</span>
          <div className={"grow slack-msg"}>
            <div className={"row wrap gap-6"}>
              <strong>{"준비실"}</strong>
              {keyed(tag("앱"))}
              <span className={"fine"} style={{ fontSize: "10px" }}>
                {"00:08 · 발송 예시"}
              </span>
            </div>
            <p className={"mt-8"}>
              <strong>{"오늘의 지원 준비 요약"}</strong>
            </p>
            <blockquote>
              {"새로 발견한 맞춤 공고 "}
              <strong>
                {keyed(S.jobs.filter((j: any) => j.new).length)}
                {"건"}
              </strong>
              <br />
              {"D-1·당일 접수 마감인 미제출 지원 "}
              <strong>
                {keyed(due.length)}
                {"건"}
              </strong>
              <br />
              {"채용 원문에서 접수 상태를 확인하세요."}
            </blockquote>
            <div className={"mt-12"}>
              {keyed(
                fixture ? (
                  <a
                    className="btn small"
                    href="https://example.com/jobs/j1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    채용 원문 확인
                  </a>
                ) : null,
              )}
            </div>
            <p className={"fine mt-12"} style={{ fontSize: "10px" }}>
              {"#job-alerts · 실제 메시지는 전송되지 않습니다."}
            </p>
          </div>
        </div>
      </Fragment>
    );
  }

  function authPage(signup = false) {
    return (
      <Fragment key={jsxKey++}>
        <div className={"auth-wrap"}>
          <section className={"auth-story"}>
            <div className={"small-brand"}>
              <span className={"brandmark"}>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>
              <strong>{"준비실"}</strong>
              <span className={"fine"}>{"가칭"}</span>
            </div>
            <div>
              <p className={"eyebrow"}>{"ONE PLACE, YOUR NEXT STEP"}</p>
              <h1>
                {"찾아본 정보가"}
                <br />
                {"다음 준비로"}
                <br />
                {"이어지도록."}
              </h1>
              <div className={"story-line"}></div>
              <div className={"column"} style={{ gap: "17px" }}>
                <div className={"row gap-16"}>
                  <span className={"fine"}>{"01"}</span>
                  <span>{"내 조건에 맞는 공고를 한눈에"}</span>
                </div>
                <div className={"row gap-16"}>
                  <span className={"fine"}>{"02"}</span>
                  <span>{"내 경험으로 쓰는 지원서"}</span>
                </div>
                <div className={"row gap-16"}>
                  <span className={"fine"}>{"03"}</span>
                  <span>{"제출본에서 이어지는 전형 준비"}</span>
                </div>
              </div>
            </div>
            <p className={"fine"} style={{ fontSize: "11px" }}>
              {fixture
                ? "다크모드 클릭형 프로토타입 · 실제 인증 없음"
                : "개인용 로컬 준비 공간"}
            </p>
          </section>
          <div className={"auth-form-wrap"}>
            <section className={"auth-form"}>
              <p className={"eyebrow"}>
                {keyed(signup ? "YOUR WORKSPACE" : "WELCOME BACK")}
              </p>
              <h1>
                {keyed(
                  signup
                    ? "나의 준비 공간 만들기"
                    : "준비하던 곳에서 다시 시작",
                )}
              </h1>
              <p className={"subtitle"}>
                {keyed(
                  fixture
                    ? signup
                      ? "일반 회원가입 화면의 검토용 시연입니다."
                      : "실제 계정 없이 화면을 확인할 수 있어요."
                    : signup
                      ? "이 PC에서 사용할 개인 계정을 만듭니다."
                      : "개인 계정으로 로그인해 자료를 이어서 준비하세요.",
                )}
              </p>
              <div className={"mt-24"}>
                {keyed(
                  field(
                    "아이디",
                    "auth-id",
                    "",
                    "text",
                    "",
                    fixture ? "예시 아이디를 입력하거나 비워두세요" : "아이디",
                  ),
                )}
                {keyed(
                  signup
                    ? field(
                        "표시 이름",
                        "auth-name",
                        "",
                        "text",
                        "",
                        "예: 지원자",
                      )
                    : "",
                )}
                {keyed(
                  field(
                    "비밀번호",
                    "auth-password",
                    "",
                    "password",
                    fixture
                      ? "실제 비밀번호를 입력하지 마세요. 입력값은 저장하지 않습니다."
                      : "비밀번호는 브라우저에 저장하지 않습니다.",
                    fixture ? "입력 없이 체험할 수 있습니다." : "비밀번호",
                  ),
                )}
              </div>
              {keyed(
                btn(
                  fixture
                    ? signup
                      ? "예시 계정으로 최초 설정"
                      : "예시 계정으로 시작"
                    : signup
                      ? "계정 만들기"
                      : "로그인",
                  signup ? "demo-signup" : "demo-login",
                  { cls: "primary w-full mt-24", icon: "arrow" },
                ),
              )}
              <div className={"row between mt-16"}>
                <span className={"fine"}>
                  {keyed(signup ? "이미 계정이 있나요?" : "처음 이용하나요?")}
                </span>
                {keyed(
                  goButton(
                    signup ? "로그인 화면" : "회원가입 화면",
                    signup ? "login" : "signup",
                    "text small",
                  ),
                )}
              </div>
              <div className={"auth-foot"}>
                {fixture
                  ? "이 시안에는 회원가입, 인증, 비밀번호 저장이 구현되어 있지 않습니다. OAuth와 이메일 인증이 없는 화면 흐름을 검토합니다."
                  : "일반 아이디와 비밀번호로 로그인합니다. 최초 계정 이후 추가 가입은 제한됩니다."}
              </div>
              <div className={"mt-20"}>
                {keyed(
                  fixture
                    ? goButton(
                        "로그인 없이 전체 화면 보기",
                        "home",
                        "ghost small",
                        "eye",
                      )
                    : null,
                )}
              </div>
            </section>
          </div>
        </div>
        <div className={"auth-skip row gap-6"}>
          <span className={"prototype-label"}>
            {fixture ? "시안 · 인증 없음" : "개인용 · 로컬"}
          </span>
          {keyed(
            btn("화면 목록", "screen-map", { cls: "small", icon: "grid" }),
          )}
        </div>
      </Fragment>
    );
  }

  function onboardingPage() {
    const n = S.onboardStep || 1;
    let content: ReactNode = null;
    if (n === 1)
      content = (
        <Fragment key={jsxKey++}>
          <h2>{"먼저, 어떤 공고를 찾을까요?"}</h2>
          <p className={"fine mt-8"}>
            {"필수 조건과 선호 조건을 구분하는 첫 설정입니다."}
          </p>
          <div className={"form-grid mt-24"}>
            {keyed(
              selectField(
                "지원 경력",
                "on-career",
                [
                  ["신입", "신입"],
                  ["신입·주니어", "신입·주니어"],
                ],
                S.profile.career,
              ),
            )}
            {keyed(field("희망 지역", "on-region", S.profile.region))}
            <div className={"span2"}>
              {keyed(field("주요 기술", "on-skills", S.profile.skills))}
            </div>
            <div className={"span2"}>
              {keyed(
                field(
                  "제외 · 확인할 조건",
                  "on-exclusions",
                  S.profile.exclusions,
                ),
              )}
            </div>
          </div>
        </Fragment>
      );
    if (n === 2)
      content = (
        <Fragment key={jsxKey++}>
          <h2>{"나를 설명하는 자료를 연결해요"}</h2>
          <p className={"fine mt-8"}>
            {"링크 등록과 실제 원문 분석은 구분됩니다. 나중에 추가해도 됩니다."}
          </p>
          <div className={"mt-24"}>
            {keyed(
              field("포트폴리오", "on-portfolio", S.profile.portfolio, "url"),
            )}
            {keyed(field("GitHub", "on-github", S.profile.github, "url"))}
            {keyed(field("기술 블로그", "on-blog", S.profile.blog, "url"))}
          </div>
          <div className={"mt-20"}>
            {keyed(
              notice(
                "이 단계는 링크를 저장하는 시연입니다. URL을 방문하거나 내용을 읽지 않습니다.",
                "",
                "link",
              ),
            )}
          </div>
        </Fragment>
      );
    if (n === 3)
      content = (
        <Fragment key={jsxKey++}>
          <h2>{"AI 실행과 알림은 PC를 통해"}</h2>
          <p className={"fine mt-8"}>
            {"실제 연결이 아니라 연결 구조를 확인하는 단계입니다."}
          </p>
          <div className={"setting-row"}>
            <span className={"connection-mark"}>{"GPT"}</span>
            <div className={"grow"}>
              <h3>{"자소서 · 전형 전략"}</h3>
              <p>{"GPT-6 Astra / Medium · 사용자가 지정한 설정값"}</p>
            </div>
            {keyed(
              tag(fixture ? "예시" : "확인 필요", fixture ? "green" : "amber"),
            )}
          </div>
          <div className={"setting-row"}>
            <span className={"connection-mark"}>{"G"}</span>
            <div className={"grow"}>
              <h3>{"공고 · 자료 검색"}</h3>
              <p>{"Gemini CLI 실행 · 실제 검색 없음"}</p>
            </div>
            {keyed(
              tag(fixture ? "예시" : "확인 필요", fixture ? "green" : "amber"),
            )}
          </div>
          <div className={"setting-row"}>
            <span className={"connection-mark"}>{"#"}</span>
            <div className={"grow"}>
              <h3>{"Slack / job-alerts"}</h3>
              <p>{"비밀 Webhook URL은 이 시안에 입력하지 않습니다."}</p>
            </div>
            {keyed(tag("미리보기", "blue"))}
          </div>
          <div className={"mt-20"}>
            {keyed(
              notice(
                "00시에 PC가 꺼져 있었다면, 다음 연결 때 오늘의 성공 기록을 확인하고 한 번 갱신하는 설계입니다.",
                "",
                "clock",
              ),
            )}
          </div>
        </Fragment>
      );
    if (n === 4)
      content = (
        <Fragment key={jsxKey++}>
          <h2>{"준비할 조건이 정리됐어요"}</h2>
          <p className={"fine mt-8"}>
            {"언제든 마이데이터와 설정에서 수정할 수 있습니다."}
          </p>
          <div className={"key-value mt-20"}>
            <span>{"경력 조건"}</span>
            <span>{keyed(esc(S.profile.career))}</span>
          </div>
          <div className={"key-value"}>
            <span>{"희망 지역"}</span>
            <span>{keyed(esc(S.profile.region))}</span>
          </div>
          <div className={"key-value"}>
            <span>{"알림 채널"}</span>
            <span>{"Slack · job-alerts"}</span>
          </div>
          <div className={"key-value"}>
            <span>{"갱신 기준"}</span>
            <span>{"매일 00시 / 미실행 시 다음 연결"}</span>
          </div>
          <div className={"key-value"}>
            <span>{"데이터 저장"}</span>
            <span>{"프로토타입은 브라우저에만 저장"}</span>
          </div>
          <div className={"mt-20"}>
            {keyed(
              notice(
                "이제 공고를 선택하고 자소서와 전형 준비 흐름을 확인할 수 있습니다. 가상의 회사와 예시 답변만 사용합니다.",
                "green",
                "checkCircle",
              ),
            )}
          </div>
        </Fragment>
      );
    return (
      <Fragment key={jsxKey++}>
        <div className={"onboarding"}>
          <div className={"row between"}>
            <div className={"row"}>
              <span className={"brandmark"}>
                <i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>
              <strong style={{ fontSize: "21px" }}>{"준비실"}</strong>
            </div>
            {keyed(
              btn("화면 목록", "screen-map", { cls: "small", icon: "grid" }),
            )}
          </div>
          <div className={"stepper"}>
            {keyed(
              ["지원 조건", "기본 자료", "연결 방식", "시작하기"].map(
                (x, i) => (
                  <Fragment key={jsxKey++}>
                    <div
                      className={`stepper-item ${i + 1 <= n ? "active" : ""}`}
                    >
                      <span>
                        {keyed(i + 1 < n ? icon("check", "sm") : i + 1)}
                      </span>
                      {keyed(x)}
                    </div>
                  </Fragment>
                ),
              ),
            )}
          </div>
          <section className={"panel"}>
            <div className={"panel-body"} style={{ padding: "28px" }}>
              {keyed(content)}
            </div>
          </section>
          <div className={"onboarding-actions"}>
            <div>
              {keyed(
                n > 1
                  ? btn("이전", "onboard-prev", { icon: "back" })
                  : goButton("나중에 설정", "home", "ghost"),
              )}
            </div>
            {keyed(
              btn(n === 4 ? "준비실 시작하기" : "다음", "onboard-next", {
                cls: "primary",
                icon: "arrow",
              }),
            )}
          </div>
          <p className={"fine mt-20"} style={{ fontSize: "11px" }}>
            {
              "실제 계정은 생성되지 않습니다. 예시 조건과 화면 이동을 확인하는 프로토타입입니다."
            }
          </p>
        </div>
      </Fragment>
    );
  }

  function notFound() {
    return empty(
      "해당 예시 화면을 찾을 수 없습니다.",
      "화면 목록에서 확인할 페이지를 선택해 주세요.",
      btn("전체 화면 목록", "screen-map", { cls: "primary", icon: "grid" }),
      "search",
    );
  }

  function homePage() {
    const imminent = S.apps.filter((a: any) => {
      const j = getJob(a.jobId);
      return (
        j?.deadline &&
        daysUntil(j.deadline) >= 0 &&
        daysUntil(j.deadline) <= 3 &&
        !a.snapshots.length &&
        a.status !== "closed"
      );
    }).length;
    const events = currentEvents()
      .filter((e: any) => e.date >= TODAY && e.type !== "deadline")
      .slice(0, 3);
    return (
      <Fragment key={jsxKey++}>
        {keyed(
          pageHead(
            "오늘의 준비",
            "새 공고를 확인하고, 진행 중인 지원을 이어가세요.",
            btn(UI.batchRunning ? "확인 중…" : "새 공고 확인", "run-batch", {
              icon: UI.batchRunning ? "clock" : "refresh",
              disabled: UI.batchRunning,
            }),
            fixture
              ? "2026. 09. 16  /  WED · 예시 기준일"
              : TODAY.replaceAll("-", ". "),
          ),
        )}
        <section className={"stats"} aria-label={"준비 현황"}>
          <div className={"stat"}>
            <div className={"stat-label"}>
              {"새로 발견한 공고 "}
              {keyed(icon("search", "sm"))}
            </div>
            <div className={"stat-number"}>
              {keyed(S.jobs.filter((j: any) => j.new).length)}
              <span>{"건"}</span>
            </div>
            <div className={"stat-desc"}>{"내 지원 조건에 맞는 검색 결과"}</div>
          </div>
          <div className={"stat"}>
            <div className={"stat-label"}>
              {"진행 중인 지원 "}
              {keyed(icon("briefcase", "sm"))}
            </div>
            <div className={"stat-number"}>
              {keyed(S.apps.filter((a: any) => a.status !== "closed").length)}
              <span>{"곳"}</span>
            </div>
            <div className={"stat-desc"}>{"준비 중부터 전형 진행까지"}</div>
          </div>
          <div className={"stat"}>
            <div className={"stat-label"}>
              {"3일 안에 마감 "}
              {keyed(icon("clock", "sm"))}
            </div>
            <div className={"stat-number"} style={{ color: "var(--amber)" }}>
              {keyed(imminent)}
              <span>{"건"}</span>
            </div>
            <div className={"stat-desc"}>{"아직 제출하지 않은 지원 기준"}</div>
          </div>
          <div className={"stat"}>
            <div className={"stat-label"}>
              {"다가오는 전형 "}
              {keyed(icon("calendar", "sm"))}
            </div>
            <div className={"stat-number"}>
              {keyed(
                currentEvents().filter(
                  (e: any) => e.type === "stage" && e.date >= TODAY,
                ).length,
              )}
              <span>{"건"}</span>
            </div>
            <div className={"stat-desc"}>{"응시 일정과 면접 준비를 확인"}</div>
          </div>
        </section>
        {keyed(
          !S.settings.batchDone ? (
            <Fragment key={jsxKey++}>
              <div className={"mb-16"}>
                {keyed(
                  notice(
                    <Fragment key={jsxKey++}>
                      <div className={"row between wrap"}>
                        <span>
                          {keyed(
                            S.settings.batchFailed
                              ? "최근 갱신을 완료하지 못한 상태입니다."
                              : "오늘 공고 확인이 아직 실행되지 않았습니다.",
                          )}
                          {" 마지막 성공 "}
                          {keyed(esc(S.settings.lastSuccess || "없음"))}
                        </span>
                        {keyed(
                          btn("갱신 흐름 시연", "run-batch", {
                            cls: "small",
                            disabled: UI.batchRunning,
                          }),
                        )}
                      </div>
                    </Fragment>,
                    "amber",
                    "clock",
                  ),
                )}
              </div>
            </Fragment>
          ) : (
            ""
          ),
        )}
        {keyed(
          UI.batchRunning ? (
            <Fragment key={jsxKey++}>
              <div
                className={"loading-line mb-16"}
                role={"progressbar"}
                aria-label={"모의 배치 진행 중"}
              >
                <span></span>
              </div>
            </Fragment>
          ) : (
            ""
          ),
        )}
        <div className={"cols-main"}>
          <div>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <div>
                  <h2>{"먼저 끝내면 좋은 일"}</h2>
                  <p className={"fine mt-8"}>
                    {"기한과 준비 상태를 기준으로 정리했어요."}
                  </p>
                </div>
                {keyed(tag("오늘의 우선순위", "outline"))}
              </div>
              {keyed(
                getApp("a1") && getApp("a2") && getApp("a4") ? (
                  <Fragment key={jsxKey++}>
                    <div className={"task-row"}>
                      <span className={"task-num"}>{"01"}</span>
                      {keyed(logo(getJob("j1")))}
                      <div className={"grow"}>
                        <div className={"row gap-6"}>
                          {keyed(
                            tag(
                              getApp("a1").snapshots.length
                                ? "제출 완료"
                                : "D-3",
                              getApp("a1").snapshots.length ? "blue" : "amber",
                            ),
                          )}
                          <span className={"fine"}>{"모노페이"}</span>
                        </div>
                        <div className={"task-title"}>
                          {keyed(
                            getApp("a1").snapshots.length
                              ? "제출한 내용에서 전형 준비를 이어가세요."
                              : "자기소개서의 남은 내용을 확인하세요.",
                          )}
                        </div>
                        <div className={"task-desc"}>
                          {keyed(
                            getApp("a1").snapshots.length
                              ? "당시 제출본과 프로필을 보관 중"
                              : "문항 " +
                                  getApp("a1").questions.filter(
                                    (q: any) => q.text,
                                  ).length +
                                  "/" +
                                  getApp("a1").questions.length +
                                  "개 작성 중 · 외부 사이트 제출 전",
                          )}
                        </div>
                      </div>
                      {keyed(
                        goButton(
                          getApp("a1").snapshots.length
                            ? "전형 준비"
                            : "이어 쓰기",
                          (getApp("a1").snapshots.length ? "prep/" : "write/") +
                            "a1",
                          "small",
                          "arrow",
                        ),
                      )}
                    </div>
                    <div className={"task-row"}>
                      <span className={"task-num"}>{"02"}</span>
                      {keyed(logo(getJob("j2")))}
                      <div className={"grow"}>
                        <div className={"row gap-6"}>
                          {keyed(tag("내일 회신", "blue"))}
                          <span className={"fine"}>{"스택로그"}</span>
                        </div>
                        <div className={"task-title"}>
                          {"면접 가능 시간과 준비 질문을 확인하세요."}
                        </div>
                        <div className={"task-desc"}>
                          {"제출본 v1을 기준으로 준비"}
                        </div>
                      </div>
                      {keyed(
                        goButton("전형 준비", "prep/a2", "small", "arrow"),
                      )}
                    </div>
                    <div className={"task-row"}>
                      <span className={"task-num"}>{"03"}</span>
                      {keyed(logo(getJob("j4")))}
                      <div className={"grow"}>
                        <div className={"row gap-6"}>
                          {keyed(tag("상시채용", "green"))}
                          <span className={"fine"}>{"루프커머스"}</span>
                        </div>
                        <div className={"task-title"}>
                          {"개인 지원 목표일을 점검하세요."}
                        </div>
                        <div className={"task-desc"}>
                          {"회사 마감일 없음 · 목표 09.22"}
                        </div>
                      </div>
                      {keyed(
                        goButton("준비실", "workspace/a4", "small", "arrow"),
                      )}
                    </div>
                  </Fragment>
                ) : (
                  <Fragment key={jsxKey++}>
                    {keyed(
                      S.apps.length
                        ? S.apps
                            .filter((a: any) => a.status !== "closed")
                            .slice(0, 3)
                            .map((a: any, i: any) => {
                              const j = getJob(a.jobId);
                              if (!j) return null;
                              return (
                                <Fragment key={jsxKey++}>
                                  <div className={"task-row"}>
                                    <span className={"task-num"}>
                                      {keyed(String(i + 1).padStart(2, "0"))}
                                    </span>
                                    {keyed(logo(j))}
                                    <div className={"grow"}>
                                      <div className={"row gap-6"}>
                                        {keyed(
                                          tag(
                                            appStatus(a.status),
                                            appStatusColor(a.status),
                                          ),
                                        )}
                                        <span className={"fine"}>
                                          {keyed(esc(j.company))}
                                        </span>
                                      </div>
                                      <div className={"task-title"}>
                                        {keyed(esc(j.title))}
                                      </div>
                                      <div className={"task-desc"}>
                                        {"문항 "}
                                        {keyed(
                                          a.questions.filter((q: any) => q.text)
                                            .length,
                                        )}
                                        {"/"}
                                        {keyed(a.questions.length)}
                                        {"개 작성 중 · 외부 사이트 제출 전"}
                                      </div>
                                    </div>
                                    {keyed(
                                      goButton(
                                        "준비실",
                                        "workspace/" + a.id,
                                        "small",
                                        "arrow",
                                      ),
                                    )}
                                  </div>
                                </Fragment>
                              );
                            })
                        : empty(
                            "진행 중인 지원이 없습니다.",
                            "확인한 공고에서 지원 준비실을 만들어 주세요.",
                            goButton("공고 찾기", "jobs", "small", "arrow"),
                          ),
                    )}
                  </Fragment>
                ),
              )}
            </section>
            <div className={"section-head mt-32"}>
              <div>
                <h2>{"새로 살펴볼 공고"}</h2>
                <p className={"fine mt-8"}>
                  {fixture
                    ? "신입·주니어 / Java·Spring / 서울·경기"
                    : [S.profile.career, S.profile.skills, S.profile.region]
                        .filter(Boolean)
                        .join(" / ") || "지원 조건을 설정해 주세요."}
                </p>
              </div>
              {keyed(goButton("전체 보기", "jobs", "ghost small", "arrow"))}
            </div>
            <section className={"panel"}>
              {keyed(
                jobTable(S.jobs.filter((j: any) => j.new).slice(0, 4), true),
              )}
              <div className={"table-bottom"}>
                <span>
                  {fixture
                    ? "검색 범위 안에서 발견한 가상의 공고입니다."
                    : "저장한 공고의 출처와 마감 기한을 확인하세요."}
                </span>
                {keyed(tag(fixture ? "예시 데이터" : "저장한 공고"))}
              </div>
            </section>
          </div>
          <aside className={"home-right"}>
            <section className={"panel"}>
              <div className={"panel-head"}>
                <h2>{"가까운 일정"}</h2>
                {keyed(goButton("", "calendar", "ghost icon-only", "calendar"))}
              </div>
              {keyed(
                events.map((e: any) => (
                  <Fragment key={jsxKey++}>
                    <div className={"schedule-row"}>
                      <div className={"date-block"}>
                        <b>{keyed(e.date.slice(8))}</b>
                        <span>
                          {fixture ? "9월" : Number(e.date.slice(5, 7)) + "월"}
                        </span>
                      </div>
                      <div className={"schedule-line"}>
                        <div className={"row gap-6"}>
                          {keyed(
                            tag(
                              eventLabel(e.type),
                              e.type === "reply"
                                ? "red"
                                : e.type === "personal"
                                  ? "green"
                                  : "blue",
                            ),
                          )}
                          <span className={"fine"} style={{ fontSize: "10px" }}>
                            {keyed(esc(e.time || "시간 미정"))}
                          </span>
                        </div>
                        <button
                          className={"schedule-title"}
                          style={{ textAlign: "left", padding: "3px 0" }}
                          data-action={"event-detail"}
                          data-id={e.id}
                          onClick={(domEvent) =>
                            act(
                              "event-detail",
                              e.id,
                              "",
                              domEvent.currentTarget,
                            )
                          }
                        >
                          {keyed(esc(e.title))}
                        </button>
                      </div>
                    </div>
                  </Fragment>
                )),
              )}
              <div style={{ padding: "10px 19px 16px" }}>
                {keyed(
                  goButton("일정 전체 보기", "calendar", "text small", "arrow"),
                )}
              </div>
            </section>
            <section className={"panel mt-20"}>
              <div className={"panel-head"}>
                <h2>{"내 경험, 확인된 만큼만"}</h2>
              </div>
              <div className={"panel-body"} style={{ paddingTop: "0" }}>
                <p className={"fine"} style={{ lineHeight: "1.9" }}>
                  {"기본 자료와 지원별 수정본을 분리해요."}
                  <br />
                  {"확인되지 않은 성과는 작성 근거로 쓰지 않습니다."}
                </p>
              </div>
              <div className={"review-progress"}>
                <div className={"row between mb-16"}>
                  <span style={{ fontSize: "12px" }}>
                    {"경험 검토 "}
                    <strong>
                      {keyed(
                        S.experiences.filter((e: any) => e.confirmed).length,
                      )}
                      {"/"}
                      {keyed(S.experiences.length)}
                    </strong>
                  </span>
                  {keyed(goButton("확인하기", "experiences", "text small"))}
                </div>
                <div className={"progress"}>
                  <span
                    style={{
                      width: `${S.experiences.length ? (100 * S.experiences.filter((e: any) => e.confirmed).length) / S.experiences.length : 0}%`,
                    }}
                  ></span>
                </div>
              </div>
            </section>
            <div className={"mt-20"}>
              {keyed(
                notice(
                  <Fragment key={jsxKey++}>
                    {fixture
                      ? "시안을 검토하다가 떠오른 수정점은 상단 "
                      : "입력한 자료의 저장 상태를 확인하고, 문제가 있으면 상단 "}
                    <strong>{"의견 남기기"}</strong>
                    {"에 적어둘 수 있습니다."}
                  </Fragment>,
                  "",
                  "message",
                ),
              )}
            </div>
          </aside>
        </div>
      </Fragment>
    );
  }
  const jobTable = (jobs: any, compact = false) => (
    <JobTable jobs={jobs} compact={compact} />
  );
  return {
    homePage,
    jobPage,
    applicationsPage,
    workspacePage,
    submissionPage,
    prepPage,
    writerPage,
    dataPage,
    experiencesPage,
    calendarPage,
    settingsPage,
    authPage,
    onboardingPage,
    workHeader,
    currentEvents,
    notFound,
  };
}
