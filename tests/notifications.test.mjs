import { test } from "node:test";
import assert from "node:assert/strict";
import { notificationPump } from "../runner/notifications.mjs";
const item = (key) => ({
  userId: "synthetic",
  key,
  payload: { type: "deadline", days: 1 },
});
test("slow delivery is single-flight and stop finishes the claimed item only", async () => {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  let sends = 0,
    claims = 0,
    completed = 0;
  const pump = notificationPump({
    enabled: true,
    send: async () => {
      sends++;
      await gate;
      return "sent";
    },
    api: async (route) => {
      if (route.endsWith("/claim")) {
        claims++;
        return { notification: item("one") };
      }
      if (route.endsWith("/complete")) completed++;
      return {};
    },
  });
  const a = pump.run(),
    b = pump.run();
  assert.equal(a, b);
  await new Promise((r) => setImmediate(r));
  assert.equal(sends, 1);
  const stop = pump.stop();
  release();
  await stop;
  await a;
  assert.equal(claims, 1);
  assert.equal(completed, 1);
  await pump.run();
  assert.equal(claims, 1);
});
test("notifications drain a bounded batch while unrelated search remains blocked", async () => {
  let claims = 0,
    sends = 0;
  const completed = [];
  const pump = notificationPump({
    enabled: true,
    maxBatch: 3,
    send: async () => {
      sends++;
      return "sent";
    },
    api: async (route, data) => {
      if (route.endsWith("/claim"))
        return { notification: item(String(++claims)) };
      if (route.endsWith("/complete")) completed.push(data.key);
      return {};
    },
  });
  let searchFinished = false,
    finishSearch;
  const search = new Promise((r) => {
    finishSearch = r;
  }).then(() => {
    searchFinished = true;
  });
  await pump.run();
  assert.equal(searchFinished, false);
  assert.equal(sends, 3);
  assert.deepEqual(completed, ["1", "2", "3"]);
  finishSearch();
  await search;
  await pump.stop();
});
test("approval off never claims; lost completion never resends an uncertain item", async () => {
  let claims = 0,
    sends = 0,
    available = true;
  const errors = [];
  const api = async (route) => {
    if (route.endsWith("/claim")) {
      claims++;
      if (!available) return { notification: null };
      available = false;
      return { notification: item("one") };
    }
    if (route.endsWith("/complete")) throw Error("synthetic API outage");
    return {};
  };
  const disabled = notificationPump({
    api,
    enabled: false,
    send: async () => {
      throw Error("forbidden");
    },
  });
  await disabled.run();
  assert.equal(claims, 0);
  const enabled = notificationPump({
    api,
    enabled: true,
    send: async () => {
      sends++;
      return "uncertain";
    },
    onError: (e) => errors.push(e),
  });
  await enabled.run();
  await enabled.run();
  assert.equal(sends, 1);
  assert.equal(errors.length, 1);
});
