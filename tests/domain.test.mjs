import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countText,
  kstDate,
  deadlineState,
  deadlineNotifications,
  blankState,
  validateState,
  snapshotFor,
} from "../server/domain.mjs";
test("Unicode codepoints, whitespace and UTF-8 bytes", () => {
  for (const n of [499, 500, 700, 701])
    assert.equal(countText("가".repeat(n)), n);
  assert.equal(countText("😀"), 1);
  assert.equal(countText("e\u0301"), 2);
  assert.equal(countText("가 😀\n", { spaces: false }), 2);
  assert.equal(countText("가😀", { unit: "bytes" }), 7);
});
test("KST midnight and unknown time", () => {
  const j = { closeType: "fixed", deadline: "2026-09-17", time: "" };
  assert.equal(kstDate(new Date("2026-09-16T14:59:59Z")), "2026-09-16");
  assert.equal(
    deadlineState(j, new Date("2026-09-17T14:59:59Z")).kind,
    "today",
  );
  assert.equal(
    deadlineState(j, new Date("2026-09-17T15:00:00Z")).kind,
    "ended",
  );
  assert.equal(
    deadlineState({ ...j, time: "18:00" }, new Date("2026-09-17T09:00:00Z"))
      .kind,
    "ended",
  );
  assert.equal(
    deadlineState({ closeType: "rolling" }, new Date()).kind,
    "rolling",
  );
  assert.equal(
    deadlineState({ closeType: "unknown" }, new Date()).kind,
    "unknown",
  );
});
test("Only unsubmitted D-1/today deadlines, no D-3/stage or backlog", () => {
  const s = blankState("test");
  s.jobs = [
    {
      id: "j",
      company: "fixture",
      title: "fixture",
      closeType: "fixed",
      deadline: "2026-09-17",
      url: "https://example.com/jobs/1",
    },
  ];
  s.apps = [{ id: "a", jobId: "j", status: "preparing", snapshots: [] }];
  for (const [day, n] of [
    ["14", 0],
    ["16", 1],
    ["17", 1],
    ["18", 0],
  ])
    assert.equal(
      deadlineNotifications(s, new Date(`2026-09-${day}T00:00:00+09:00`))
        .length,
      n,
    );
  s.apps[0].status = "submitted";
  assert.equal(
    deadlineNotifications(s, new Date("2026-09-17T00:00:00+09:00")).length,
    0,
  );
});
test("Snapshot detaches prior profile and answers", () => {
  const s = blankState("test");
  s.jobs = [{ id: "j" }];
  s.apps = [
    {
      id: "a",
      jobId: "j",
      profile: { summary: "confirmed" },
      questions: [{ id: "q", text: "original" }],
      snapshots: [],
    },
  ];
  s.experiences = [
    { id: "selected", confirmed: true },
    { id: "excluded", confirmed: true },
    { id: "deleted", confirmed: true, softDeleted: true },
    { id: "unconfirmed", confirmed: false },
  ];
  s.apps[0].evidence = { excluded: false };
  const snap = snapshotFor(s, "a");
  assert.deepEqual(
    snap.experiences.map((e) => e.id),
    ["selected"],
  );
  s.apps[0].profile.summary = "new";
  s.apps[0].questions[0].text = "changed";
  assert.equal(snap.profile.summary, "confirmed");
  assert.equal(snap.questions[0].text, "original");
});
test("Client cannot forge immutable snapshots", () => {
  const old = blankState("test");
  old.jobs = [
    { id: "j", company: "fixture", title: "fixture", closeType: "unknown" },
  ];
  old.apps = [
    { id: "a", jobId: "j", status: "preparing", questions: [], snapshots: [] },
  ];
  const next = structuredClone(old);
  next.apps[0].snapshots = [{ id: "fake" }];
  assert.throws(() => validateState(next, old), /제출본/);
});
test("No submission state without snapshot, missing profile or impossible date", () => {
  const old = blankState("test");
  old.jobs = [
    { id: "j", company: "fixture", title: "fixture", closeType: "unknown" },
  ];
  const base = {
    id: "a",
    jobId: "j",
    status: "preparing",
    profile: old.profile,
    questions: [],
    snapshots: [],
    stages: [],
  };
  let next = structuredClone(old);
  next.apps = [{ ...base, status: "submitted" }];
  assert.throws(() => validateState(next, old), /제출본/);
  next.apps = [{ ...base, profile: undefined }];
  assert.throws(() => validateState(next, old), /프로필/);
  next.apps = [{ ...base, snapshots: undefined }];
  assert.throws(() => validateState(next, old), /제출본 목록/);
  next.apps = [base];
  next.jobs[0].deadline = "2026-02-30";
  assert.throws(() => validateState(next, old), /마감 날짜/);
});
