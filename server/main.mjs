import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { pool, transaction, migrate } from "./db.mjs";
import {
  blankState,
  demand,
  HttpError,
  validateState,
  snapshotFor,
  kstDate,
  publicURL,
  deadlineNotifications,
} from "./domain.mjs";
import {
  passwordHash,
  passwordMatches,
  userFor,
  newSession,
  sessionToken,
  digest,
} from "./auth.mjs";

const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1";
const origins = new Set([
  process.env.APP_ORIGIN || "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://127.0.0.1:5173", "http://localhost:5173"]
    : []),
]);
const filesDir = process.env.FILES_DIR || path.resolve("private/files");
const send = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
async function body(req) {
  demand(
    req.headers["content-type"]?.split(";")[0] === "application/json",
    "JSON 요청이 필요합니다.",
    415,
  );
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    demand(size <= 2_000_000, "요청이 너무 큽니다.", 413);
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON 형식 오류");
  }
}
async function stateFor(client, userId, lock = false) {
  const { rows } = await client.query(
    `SELECT revision,data FROM user_state WHERE user_id=$1${lock ? " FOR UPDATE" : ""}`,
    [userId],
  );
  demand(rows[0], "저장 자료가 없습니다.", 404);
  return rows[0];
}
async function saveState(client, userId, old, next) {
  await client.query(
    "INSERT INTO state_history(user_id,revision,data) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [userId, old.revision, old.data],
  );
  const { rows } = await client.query(
    "UPDATE user_state SET data=$2,revision=revision+1,updated_at=now() WHERE user_id=$1 RETURNING revision,data",
    [userId, next],
  );
  return { revision: rows[0].revision, state: rows[0].data };
}
async function rateLimit(key) {
  const { rows } = await pool.query(
    `INSERT INTO auth_attempts(key,failures) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.failures+1 END,window_start=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING failures`,
    [key],
  );
  demand(rows[0].failures <= 10, "잠시 후 다시 로그인해 주세요.", 429);
}
function runnerAuthorized(req) {
  const expected = process.env.RUNNER_TOKEN || "",
    actual = (req.headers.authorization || "").replace(/^Bearer /, "");
  return (
    expected.length >= 32 &&
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  );
}

async function runnerAPI(req, res, url) {
  demand(runnerAuthorized(req), "실행기 인증이 필요합니다.", 401);
  if (req.method === "POST" && url.pathname === "/api/runner/tick") {
    await transaction(async (c) => {
      const { rows: users } = await c.query(
        "SELECT user_id,data FROM user_state",
      );
      const { rows: runners } = await c.query(
        "SELECT capabilities FROM runner_status WHERE id=1 AND seen_at>now()-interval '90 seconds'",
      );
      for (const row of users) {
        const today = kstDate();
        if (runners[0]?.capabilities.search && row.data.settings.newJobs) {
          const input = {
            referenceDate: today,
            conditions: {
              career: row.data.profile.career,
              skills: row.data.profile.skills,
              region: row.data.profile.region,
              exclusions: row.data.profile.exclusions,
            },
          };
          // One current-day key; never replay missed calendar dates or reset failed attempts.
          await c.query(
            "INSERT INTO tasks(id,user_id,type,dedupe_key,input) VALUES($1,$2,'search',$3,$4) ON CONFLICT(user_id,dedupe_key) DO NOTHING",
            [randomUUID(), row.user_id, `search:${today}`, input],
          );
        }
        for (const item of deadlineNotifications(row.data)) {
          if (!publicURL(item.url)) continue;
          await c.query(
            "INSERT INTO notification_records(user_id,key,status,payload) VALUES($1,$2,'pending',$3) ON CONFLICT DO NOTHING",
            [row.user_id, item.key, { type: "deadline", ...item }],
          );
        }
      }
    });
    return send(res, 200, { ok: true });
  }
  if (
    req.method === "POST" &&
    url.pathname === "/api/runner/notifications/claim"
  ) {
    const notification = await transaction(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM notification_records WHERE status='pending' ORDER BY key FOR UPDATE SKIP LOCKED LIMIT 1",
      );
      const n = rows[0];
      if (!n) return null;
      if (n.payload.type === "deadline") {
        const state = await stateFor(c, n.user_id, true);
        const latest = deadlineNotifications(state.data).find(
          (v) => v.key === n.key,
        );
        if (!latest || !publicURL(latest.url)) {
          await c.query(
            "UPDATE notification_records SET status='cancelled' WHERE user_id=$1 AND key=$2",
            [n.user_id, n.key],
          );
          return null;
        }
        n.payload = { type: "deadline", ...latest };
      }
      // Claim marks uncertain before external I/O. A crash cannot silently cause a duplicate send.
      await c.query(
        "UPDATE notification_records SET status='uncertain',attempted_at=now(),payload=$3 WHERE user_id=$1 AND key=$2",
        [n.user_id, n.key, n.payload],
      );
      return { userId: n.user_id, key: n.key, payload: n.payload };
    });
    return send(res, 200, { notification });
  }
  if (
    req.method === "POST" &&
    url.pathname === "/api/runner/notifications/complete"
  ) {
    const b = await body(req);
    demand(
      ["sent", "failed", "uncertain"].includes(b.status),
      "알림 상태 오류",
    );
    await pool.query(
      "UPDATE notification_records SET status=$3 WHERE user_id=$1 AND key=$2 AND status='uncertain'",
      [b.userId, b.key, b.status],
    );
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/api/runner/heartbeat") {
    const b = await body(req);
    const capabilities = {
      search: b.capabilities?.search === true,
      draft: b.capabilities?.draft === true,
      questions: b.capabilities?.questions === true,
    };
    await pool.query(
      "INSERT INTO runner_status(id,seen_at,capabilities) VALUES(1,now(),$1) ON CONFLICT(id) DO UPDATE SET seen_at=now(),capabilities=$1",
      [capabilities],
    );
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && url.pathname === "/api/runner/claim") {
    const task = await transaction(async (c) => {
      await c.query(
        "UPDATE tasks SET status='failed',error_code='LEASE_EXPIRED',finished_at=now() WHERE status='running' AND lease_until<now()",
      );
      const { rows } = await c.query(
        "SELECT * FROM tasks WHERE status='queued' AND EXISTS (SELECT 1 FROM runner_status r WHERE r.id=1 AND r.seen_at>now()-interval '90 seconds' AND r.capabilities->>tasks.type='true') ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1",
      );
      if (!rows[0]) return null;
      const token = randomUUID();
      const { rows: updated } = await c.query(
        "UPDATE tasks SET status='running',attempt=attempt+1,attempt_token=$2,lease_until=now()+interval '5 minutes' WHERE id=$1 RETURNING id,type,input,attempt_token,lease_until",
        [rows[0].id, token],
      );
      return updated[0];
    });
    return send(res, 200, { task });
  }
  const pulse = url.pathname.match(
    /^\/api\/runner\/tasks\/([a-f0-9-]+)\/heartbeat$/,
  );
  if (req.method === "POST" && pulse) {
    const b = await body(req);
    const result = await pool.query(
      "UPDATE tasks SET lease_until=now()+interval '5 minutes' WHERE id=$1 AND attempt_token=$2 AND status='running' AND lease_until>now() RETURNING id",
      [pulse[1], b.attemptToken],
    );
    demand(result.rowCount, "작업이 취소됐거나 소유권이 만료됐습니다.", 409);
    return send(res, 200, { ok: true });
  }
  const complete = url.pathname.match(
    /^\/api\/runner\/tasks\/([a-f0-9-]+)\/complete$/,
  );
  if (req.method === "POST" && complete) {
    const b = await body(req);
    await transaction(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM tasks WHERE id=$1 FOR UPDATE",
        [complete[1]],
      );
      const task = rows[0];
      demand(
        task &&
          task.status === "running" &&
          task.attempt_token === b.attemptToken &&
          new Date(task.lease_until) > new Date(),
        "작업 소유권이 만료됐습니다.",
        409,
      );
      if (b.errorCode) {
        demand(
          [
            "AUTH_REQUIRED",
            "LIMIT_REACHED",
            "TIMEOUT",
            "MALFORMED_OUTPUT",
            "SEARCH_FAILED",
            "UNSUPPORTED",
            "CANCELLED",
          ].includes(b.errorCode),
          "작업 오류 코드 오류",
        );
        await c.query(
          "UPDATE tasks SET status='failed',error_code=$2,finished_at=now() WHERE id=$1",
          [task.id, b.errorCode],
        );
        return;
      }
      let result;
      if (task.type === "search") {
        demand(
          Array.isArray(b.result?.jobs) && b.result.jobs.length <= 50,
          "검색 결과 형식 오류",
        );
        result = {
          jobs: b.result.jobs.map((j) => {
            demand(
              typeof j.company === "string" &&
                typeof j.title === "string" &&
                publicURL(j.url),
              "공개 출처가 있는 공고만 저장할 수 있습니다.",
            );
            demand(
              j.verifiedAt && Number.isFinite(Date.parse(j.verifiedAt)),
              "확인 시각이 필요합니다.",
            );
            return {
              id: randomUUID(),
              company: j.company,
              title: j.title,
              url: j.url,
              manualURL: j.url,
              posted: j.posted || null,
              deadline: j.deadline || null,
              time: j.time || "",
              closeType: j.deadline
                ? "fixed"
                : j.closeType === "rolling"
                  ? "rolling"
                  : "unknown",
              exp: j.exp || "미확인",
              region: j.region || "미확인",
              type: j.employment || "미확인",
              domain: j.domain || "",
              skills: Array.isArray(j.skills) ? j.skills : [],
              sources: 1,
              source: j.source || "공개 검색",
              intro: j.summary || "",
              mark: j.company.slice(0, 1),
              color: "",
              new: true,
              firstDiscoveredAt: new Date().toISOString(),
              lastVerifiedAt: j.verifiedAt,
              lastAttemptAt: new Date().toISOString(),
            };
          }),
        };
        const old = await stateFor(c, task.user_id, true),
          state = structuredClone(old.data);
        let added = 0,
          changed = 0;
        for (const job of result.jobs) {
          const existing = state.jobs.find(
            (j) =>
              (j.url || j.manualURL) === job.url &&
              j.company === job.company &&
              j.title === job.title,
          );
          if (existing) {
            if (
              existing.deadline !== job.deadline ||
              existing.time !== job.time
            )
              changed++;
            Object.assign(existing, {
              deadline: job.deadline,
              time: job.time,
              closeType: job.closeType,
              lastVerifiedAt: job.lastVerifiedAt,
              lastAttemptAt: job.lastAttemptAt,
            });
          } else {
            state.jobs.push(job);
            added++;
          }
        }
        state.settings = {
          ...state.settings,
          batchDone: true,
          batchFailed: false,
          lastSuccess: new Date().toISOString(),
          lastSuccessDate: task.input.referenceDate,
          newCount: added,
        };
        validateState(state, old.data);
        await saveState(c, task.user_id, old, state);
        result = { ...result, added, changed };
        await c.query(
          "INSERT INTO notification_records(user_id,key,status,payload) VALUES($1,$2,'pending',$3) ON CONFLICT DO NOTHING",
          [
            task.user_id,
            `summary:${task.id}`,
            {
              type: "summary",
              added,
              changed,
              jobs: result.jobs.map((j) => ({
                company: j.company,
                title: j.title,
                url: j.url,
              })),
            },
          ],
        );
      } else if (task.type === "draft") {
        demand(
          typeof b.result?.text === "string" && b.result.text.length <= 100000,
          "생성 본문 형식 오류",
        );
        result = {
          text: b.result.text,
          baseRevision: task.input.baseRevision,
          questionId: task.input.questionId,
        };
      } else {
        demand(
          Array.isArray(b.result?.questions) && b.result.questions.length <= 50,
          "질문 결과 형식 오류",
        );
        result = {
          questions: b.result.questions,
          submissionId: task.input.submissionId,
        };
      }
      await c.query(
        "UPDATE tasks SET status='succeeded',result=$2,finished_at=now() WHERE id=$1",
        [task.id, result],
      );
    });
    return send(res, 200, { ok: true });
  }
  throw new HttpError(404, "실행기 경로가 없습니다.");
}

async function api(req, res, url) {
  if (req.method !== "GET") {
    demand(
      !req.headers.origin || origins.has(req.headers.origin),
      "허용하지 않는 요청 출처입니다.",
      403,
    );
    demand(
      !req.headers["sec-fetch-site"] ||
        ["same-origin", "same-site", "none"].includes(
          req.headers["sec-fetch-site"],
        ),
      "외부 사이트 요청은 허용하지 않습니다.",
      403,
    );
  }
  if (url.pathname.startsWith("/api/runner/")) return runnerAPI(req, res, url);
  if (url.pathname === "/api/health") {
    await pool.query("SELECT 1");
    return send(res, 200, { ok: true });
  }
  if (
    req.method === "POST" &&
    ["/api/auth/register", "/api/auth/login"].includes(url.pathname)
  ) {
    await rateLimit(`ip:${req.socket.remoteAddress}`);
    const b = await body(req);
    demand(
      typeof b.username === "string" &&
        /^[\p{L}\p{N}_.@-]{3,80}$/u.test(b.username),
      "아이디는 3–80자의 문자·숫자로 입력하세요.",
    );
    demand(
      typeof b.password === "string" &&
        b.password.length >= 12 &&
        b.password.length <= 256,
      "비밀번호는 12–256자로 입력하세요.",
    );
    const username = b.username.toLowerCase();
    await rateLimit(`user:${digest(username)}`);
    let user;
    if (url.pathname.endsWith("register")) {
      const hash = await passwordHash(b.password);
      user = await transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(739201)");
        const count = await c.query("SELECT count(*)::int AS n FROM users");
        demand(
          count.rows[0].n === 0 || process.env.ALLOW_TEST_USERS === "true",
          "개인용 계정이 이미 만들어졌습니다. 추가 가입은 닫혀 있습니다.",
          403,
        );
        const id = randomUUID();
        await c.query(
          "INSERT INTO users(id,username,password_hash) VALUES($1,$2,$3)",
          [id, username, hash],
        );
        await c.query("INSERT INTO user_state(user_id,data) VALUES($1,$2)", [
          id,
          blankState(username),
        ]);
        return { id, username };
      });
    } else {
      const { rows } = await pool.query(
        "SELECT id,username,password_hash FROM users WHERE username=$1",
        [username],
      );
      const found = rows[0];
      const dummy = "00000000000000000000000000000000:" + "0".repeat(128);
      const valid = await passwordMatches(
        b.password,
        found?.password_hash || dummy,
      );
      demand(found && valid, "아이디 또는 비밀번호를 확인해 주세요.", 401);
      user = { id: found.id, username: found.username };
    }
    await pool.query("DELETE FROM auth_attempts WHERE key=$1", [
      `user:${digest(username)}`,
    ]);
    await newSession(user.id, res);
    return send(res, 200, { user });
  }
  const user = await userFor(req);
  if (url.pathname === "/api/auth/me") return send(res, 200, { user });
  demand(user, "로그인이 필요합니다.", 401);
  if (req.method === "GET" && url.pathname === "/api/connections") {
    const { rows } = await pool.query(
      "SELECT seen_at,capabilities FROM runner_status WHERE id=1 AND seen_at>now()-interval '90 seconds'",
    );
    return send(res, 200, {
      runner: !!rows[0],
      lastSeen: rows[0]?.seen_at || null,
      capabilities: rows[0]?.capabilities || {
        search: false,
        draft: false,
        questions: false,
      },
      slack: "unverified",
    });
  }
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    await pool.query("DELETE FROM sessions WHERE token_hash=$1", [
      digest(sessionToken(req)),
    ]);
    res.setHeader(
      "Set-Cookie",
      "junbisil_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
    return send(res, 200, { ok: true });
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    const s = await stateFor(pool, user.id);
    return send(res, 200, { revision: s.revision, state: s.data });
  }
  if (req.method === "PUT" && url.pathname === "/api/state") {
    const b = await body(req);
    const data = await transaction(async (c) => {
      const old = await stateFor(c, user.id, true);
      demand(
        old.revision === b.expectedRevision,
        "다른 화면에서 자료가 변경됐습니다. 입력을 보존한 채 새 버전을 확인하세요.",
        409,
      );
      const next = validateState(b.state, old.data);
      return saveState(c, user.id, old, next);
    });
    return send(res, 200, data);
  }
  const submission = url.pathname.match(
    /^\/api\/applications\/([^/]+)\/submissions$/,
  );
  if (req.method === "POST" && submission) {
    const b = await body(req);
    demand(
      b.confirmedExternalSubmission === true,
      "외부 사이트 제출을 직접 확인해 주세요.",
    );
    const data = await transaction(async (c) => {
      const old = await stateFor(c, user.id, true);
      demand(
        old.revision === b.expectedRevision,
        "저장 버전이 변경됐습니다.",
        409,
      );
      const state = structuredClone(old.data),
        snapshot = snapshotFor(state, submission[1]);
      await c.query(
        "INSERT INTO submissions(id,user_id,application_id,version,snapshot) VALUES($1,$2,$3,$4,$5)",
        [snapshot.id, user.id, submission[1], snapshot.version, snapshot],
      );
      const app = state.apps.find((a) => a.id === submission[1]);
      app.snapshots = [...(app.snapshots || []), snapshot];
      app.status = "submitted";
      return saveState(c, user.id, old, state);
    });
    return send(res, 201, data);
  }
  if (req.method === "GET" && url.pathname === "/api/tasks") {
    const { rows } = await pool.query(
      "SELECT id,type,status,input,result,error_code,created_at,finished_at FROM tasks WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
      [user.id],
    );
    return send(res, 200, { tasks: rows });
  }
  if (req.method === "POST" && url.pathname === "/api/tasks") {
    const b = await body(req);
    demand(["search", "draft", "questions"].includes(b.type), "작업 유형 오류");
    const runner = await pool.query(
      "SELECT capabilities FROM runner_status WHERE id=1 AND seen_at>now()-interval '90 seconds'",
    );
    demand(
      runner.rows[0]?.capabilities?.[b.type],
      "해당 AI 실행기가 연결되지 않았습니다.",
      503,
    );
    const task = await transaction(async (c) => {
      const s = await stateFor(c, user.id, true);
      let input = { referenceDate: kstDate(), baseRevision: s.revision };
      if (b.type === "search")
        input = {
          ...input,
          conditions: {
            career: s.data.profile.career,
            skills: s.data.profile.skills,
            region: s.data.profile.region,
            exclusions: s.data.profile.exclusions,
          },
        };
      else {
        const app = s.data.apps.find((a) => a.id === b.applicationId);
        demand(app, "지원 기록이 없습니다.", 404);
        if (b.type === "draft") {
          const q = app.questions.find(
            (q) => q.id === b.questionId && !q.softDeleted,
          );
          demand(q, "문항이 없습니다.", 404);
          input = {
            ...input,
            applicationId: app.id,
            questionId: q.id,
            question: q,
            job: s.data.jobs.find((j) => j.id === app.jobId),
            profile: app.profile,
            experiences: s.data.experiences.filter(
              (e) =>
                e.confirmed && !e.softDeleted && app.evidence?.[e.id] !== false,
            ),
          };
        } else {
          const snapshot = app.snapshots.find((sn) => sn.id === b.submissionId);
          demand(snapshot, "확정한 제출본을 선택해 주세요.");
          input = {
            ...input,
            applicationId: app.id,
            submissionId: snapshot.id,
            snapshot,
          };
        }
      }
      const key =
        b.type === "search"
          ? `search:${input.referenceDate}`
          : `${b.type}:${digest(JSON.stringify(input))}`;
      const { rows } = await c.query(
        "INSERT INTO tasks(id,user_id,type,dedupe_key,input) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,dedupe_key) DO UPDATE SET dedupe_key=excluded.dedupe_key RETURNING id,type,status,created_at",
        [randomUUID(), user.id, b.type, key, input],
      );
      return rows[0];
    });
    return send(res, 202, { task });
  }
  const cancel = url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)\/cancel$/);
  if (req.method === "POST" && cancel) {
    const r = await pool.query(
      "UPDATE tasks SET status='cancelled',finished_at=now() WHERE id=$1 AND user_id=$2 AND status IN ('queued','running') RETURNING id",
      [cancel[1], user.id],
    );
    demand(r.rowCount, "취소할 작업이 없습니다.", 404);
    return send(res, 200, { ok: true });
  }
  const retry = url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)\/retry$/);
  if (req.method === "POST" && retry) {
    const { rows } = await pool.query(
      "UPDATE tasks SET status='queued',error_code=null,attempt_token=null,lease_until=null,finished_at=null WHERE id=$1 AND user_id=$2 AND status IN ('failed','cancelled') AND attempt<3 AND finished_at<now()-interval '60 seconds' RETURNING id,type,status",
      [retry[1], user.id],
    );
    demand(
      rows[0],
      "실패 후 60초 대기 및 최대 3회 시도 제한을 확인하세요.",
      409,
    );
    return send(res, 202, { task: rows[0] });
  }
  const apply = url.pathname.match(/^\/api\/tasks\/([a-f0-9-]+)\/apply$/);
  if (req.method === "POST" && apply) {
    const b = await body(req);
    const result = await transaction(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM tasks WHERE id=$1 AND user_id=$2 AND status='succeeded'",
        [apply[1], user.id],
      );
      const task = rows[0];
      demand(
        task && task.type !== "search",
        "적용할 생성 결과가 없습니다.",
        404,
      );
      const old = await stateFor(c, user.id, true);
      demand(
        old.revision === b.expectedRevision &&
          old.revision === task.input.baseRevision,
        "생성 후 자료가 변경됐습니다. 현재 입력을 보존하고 결과를 비교해 주세요.",
        409,
      );
      const state = structuredClone(old.data),
        app = state.apps.find((a) => a.id === task.input.applicationId);
      demand(app, "지원 기록이 없습니다.", 404);
      if (task.type === "draft") {
        const q = app.questions.find((q) => q.id === task.input.questionId);
        demand(q, "문항이 없습니다.", 404);
        app.versions = [
          ...(app.versions || []),
          {
            id: randomUUID(),
            label: "생성 결과 적용 전",
            date: new Date().toISOString(),
            questionId: q.id,
            text: q.text,
            taskId: task.id,
          },
        ];
        q.text = task.result.text;
      } else {
        app.qa = [
          ...(app.qa || []),
          ...task.result.questions.map((q) => ({
            ...q,
            id: randomUUID(),
            submissionId: task.input.submissionId,
          })),
        ];
      }
      return saveState(c, user.id, old, state);
    });
    return send(res, 200, result);
  }
  const file = url.pathname.match(/^\/api\/files\/([a-f0-9-]+)$/);
  if (req.method === "GET" && file) {
    const { rows } = await pool.query(
      "SELECT * FROM files WHERE id=$1 AND user_id=$2",
      [file[1], user.id],
    );
    demand(rows[0], "파일이 없습니다.", 404);
    const bytes = await fs.readFile(path.join(filesDir, rows[0].id));
    res.writeHead(200, {
      "Content-Type": rows[0].mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].name)}`,
      "Cache-Control": "no-store",
    });
    return res.end(bytes);
  }
  if (req.method === "POST" && url.pathname === "/api/files") {
    const b = await body(req);
    demand(
      typeof b.name === "string" &&
        b.name.length <= 200 &&
        typeof b.base64 === "string",
      "파일 형식 오류",
    );
    const allowed = {
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    const mime = allowed[path.extname(b.name).toLowerCase()];
    demand(mime, "PDF/TXT/MD/DOCX만 등록할 수 있습니다.");
    const bytes = Buffer.from(b.base64, "base64");
    demand(bytes.length <= 1_000_000, "현재 파일 제한은 1MB입니다.", 413);
    const id = randomUUID();
    await fs.mkdir(filesDir, { recursive: true });
    await fs.writeFile(path.join(filesDir, id), bytes, { flag: "wx" });
    await pool.query(
      "INSERT INTO files(id,user_id,name,mime,size,sha256) VALUES($1,$2,$3,$4,$5,$6)",
      [id, user.id, path.basename(b.name), mime, bytes.length, digest(bytes)],
    );
    return send(res, 201, {
      file: {
        id,
        name: path.basename(b.name),
        size: bytes.length,
        sha256: digest(bytes),
        url: `/api/files/${id}`,
      },
    });
  }
  throw new HttpError(404, "요청한 경로가 없습니다.");
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
export const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
  try {
    const authority = req.headers.host || "";
    demand(
      /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(authority),
      "허용하지 않는 호스트입니다.",
      403,
    );
    const url = new URL(req.url, `http://${authority}`);
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    demand(
      req.method === "GET" || req.method === "HEAD",
      "지원하지 않는 요청입니다.",
      405,
    );
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, ""),
      base = path.resolve("dist");
    let file = path.resolve(base, relative || "index.html");
    demand(file.startsWith(base + path.sep), "잘못된 경로입니다.", 403);
    try {
      await fs.access(file);
    } catch {
      file = path.join(base, "index.html");
    }
    const bytes = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (e) {
    if (res.headersSent) {
      res.end();
      return;
    }
    send(res, e.status || 500, {
      error: e.status ? e.message : "서버 요청을 처리하지 못했습니다.",
      code:
        e.status === 409
          ? "CONFLICT"
          : e.status === 503
            ? "RUNNER_UNAVAILABLE"
            : "REQUEST_FAILED",
    });
    if (!e.status) console.error("request failed", e.code || e.name);
  }
});
await migrate();
server.listen(port, host, () =>
  console.log(`Local web/API listening on port ${port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await pool.end();
      process.exit(0);
    }),
  );
