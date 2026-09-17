// 공개 목록에서 사람이 발견한 링크를 원문 검증 후 보존한다. 자동 검색 성공으로 표시하지 않는다.
import fs from "node:fs/promises";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { verifyWantedSource } from "../runner/posting-source.mjs";
import { validateState } from "../server/domain.mjs";

const url = process.argv[2];
if (!url)
  throw Error(
    "Usage: node scripts/collect-verified-link.mjs SOURCE_URL [--apply]",
  );
const env = await fs.readFile(".env", "utf8");
const password = env.match(/^POSTGRES_PASSWORD=(.+)$/m)?.[1].trim();
const client = new pg.Client({
  host: "127.0.0.1",
  port: 5433,
  database: "jobprep",
  user: "jobprep",
  password,
});
try {
  await client.connect();
  const initial = await client.query(
    "select user_id, revision, data from user_state",
  );
  if (initial.rows.length !== 1)
    throw Error("Exactly one personal owner required");
  const original = initial.rows[0];
  const verified = await verifyWantedSource(url, original.data.profile);
  const report = {
    verified,
    discoveryMode: "human-reviewed-public-list",
    automaticDiscoveryVerified: false,
    applied: false,
  };
  if (process.argv.includes("--apply")) {
    await client.query("BEGIN");
    const {
      rows: [old],
    } = await client.query(
      "select * from user_state where user_id=$1 for update",
      [original.user_id],
    );
    if (old.revision !== original.revision)
      throw Error("State changed; review again");
    if (old.data.jobs.some((j) => (j.url || j.manualURL) === verified.url)) {
      await client.query("ROLLBACK");
      report.duplicate = true;
    } else {
      const state = structuredClone(old.data);
      state.jobs.push({
        ...verified,
        id: randomUUID(),
        manualURL: verified.url,
        intro: verified.summary,
        mark: verified.company.slice(0, 1),
        color: "",
        sources: 1,
        new: true,
        firstDiscoveredAt: verified.verifiedAt,
        lastVerifiedAt: verified.verifiedAt,
        lastAttemptAt: verified.verifiedAt,
        verificationNote:
          "공개 채용 목록에서 직접 발견하고 원문 구조화 데이터로 모집 상태 확인. 자동 검색 발견 성공과 구분.",
      });
      validateState(state, old.data);
      await client.query(
        "insert into state_history(user_id,revision,data) values($1,$2,$3)",
        [old.user_id, old.revision, old.data],
      );
      await client.query(
        "update user_state set data=$2,revision=revision+1,updated_at=now() where user_id=$1",
        [old.user_id, state],
      );
      const key = `summary:reviewed-open-link:${randomUUID()}`;
      await client.query(
        "insert into notification_records(user_id,key,status,payload) values($1,$2,'pending',$3)",
        [
          old.user_id,
          key,
          {
            type: "summary",
            added: 1,
            changed: 0,
            jobs: [
              {
                company: verified.company,
                title: verified.title,
                url: verified.url,
              },
            ],
          },
        ],
      );
      await client.query("COMMIT");
      report.applied = true;
      report.notificationKey = key;
      report.revision = old.revision + 1;
    }
  }
  await fs.mkdir("artifacts/automation", { recursive: true });
  await fs.writeFile(
    "artifacts/automation/verified-open-link.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end();
}
