// Own polling lane: a long AI task must not delay deadline candidate checks.
// The API claims as 'uncertain' before sending, preserving crash/duplicate protection.
export function notificationPump({
  api,
  send,
  enabled,
  onError = () => {},
  maxBatch = 10,
}) {
  let pending = null,
    stopped = false;
  async function poll() {
    try {
      await api("/api/runner/tick");
    } catch {
      onError("Deadline check unavailable; will retry on the next poll.");
    }
    if (!enabled || stopped) return;
    try {
      for (let i = 0; i < maxBatch && !stopped; i++) {
        const { notification } = await api("/api/runner/notifications/claim");
        if (!notification) break;
        const status = await send(notification.payload);
        await api("/api/runner/notifications/complete", {
          userId: notification.userId,
          key: notification.key,
          status,
        });
      }
    } catch {
      onError("Notification check unavailable; search results are preserved.");
    }
  }
  return {
    run() {
      if (stopped) return Promise.resolve();
      if (!pending)
        pending = poll().finally(() => {
          pending = null;
        });
      return pending;
    },
    async stop() {
      stopped = true;
      await pending;
    },
  };
}
