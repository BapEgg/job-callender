import { spawn } from "node:child_process";
export function runProcess(
  executable,
  args,
  { cwd, input = "", timeoutMs = 240000, env = process.env, signal } = {},
) {
  return new Promise((resolve) => {
    let stdout = "",
      stderr = "",
      ended = false;
    const child = spawn(executable, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const finish = (result) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ errorCode: "TIMEOUT" });
    }, timeoutMs);
    const cancel = () => {
      child.kill();
      finish({ errorCode: "CANCELLED" });
    };
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    child.stdout.on("data", (b) => {
      stdout += b.toString();
      if (stdout.length > 1_000_000) {
        child.kill();
        finish({ errorCode: "MALFORMED_OUTPUT" });
      }
    });
    child.stderr.on("data", (b) => {
      stderr += b.toString();
      if (stderr.length > 1_000_000) {
        child.kill();
        finish({ errorCode: "MALFORMED_OUTPUT" });
      }
    });
    child.on("error", () => finish({ errorCode: "UNSUPPORTED" }));
    child.on("close", (code) => {
      if (code !== 0) {
        const combined = stdout + stderr;
        finish({
          errorCode: /quota|rate.limit|usage.limit/i.test(combined)
            ? "LIMIT_REACHED"
            : /auth|login|sign.in/i.test(combined)
              ? "AUTH_REQUIRED"
              : "SEARCH_FAILED",
        });
      } else finish({ stdout });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}
export function loginEnvironment() {
  const allowed = [
    "PATH",
    "PATHEXT",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "USERPROFILE",
    "HOME",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
    "CODEX_HOME",
  ];
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      allowed.includes(key.toUpperCase()),
    ),
  );
}
