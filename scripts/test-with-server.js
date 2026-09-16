#!/usr/bin/env node
/**
 * Test runner: starts a production Next.js server, waits for /api/health,
 * runs the vitest suite against it, and tears everything down.
 *
 * Usage:
 *   node scripts/test-with-server.js           # one-shot run
 *   node scripts/test-with-server.js --watch   # start server, run vitest in watch mode
 *
 * Env:
 *   TEST_BASE_URL    – defaults to http://localhost:3000
 *   TEST_PORT        – defaults to 3000
 *   MONGODB_URI      – falls back to .env.local / .env (same lookup as seed script)
 *
 * Mirrors the GitHub Actions workflow (.github/workflows/ci.yml):
 *   seed → build → start → wait for /api/health → npm test
 */
const { spawn, execSync } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.TEST_PORT || "3000";
const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;
const WATCH = process.argv.includes("--watch");

// ── Minimal .env loader (no dotenv dependency) ─────────────
const root = path.join(__dirname, "..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(root, file);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("<")) {
  console.error(
    "[test-with-server] MONGODB_URI is not set. Add it to .env.local (or export it) first."
  );
  process.exit(1);
}

// ── Wait for the health endpoint to return 200 ─────────────
function waitForHealth(url, timeoutMs = 90_000, intervalMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume(); // drain
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on("error", retry);
      req.setTimeout(5_000, () => {
        req.destroy();
        retry();
        });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Server did not become healthy at ${url} within ${timeoutMs / 1000}s`));
      } else {
        setTimeout(attempt, intervalMs);
      }
    };
    attempt();
  });
}

// ── Build if needed (skip with SKIP_BUILD=1 for quick loops) ──
if (!process.env.SKIP_BUILD && !fs.existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.log("[test-with-server] Building production bundle (SKIP_BUILD=1 to skip)…");
  execSync("npx next build", { stdio: "inherit", cwd: root });
}

// ── Start production server ────────────────────────────────
console.log(`[test-with-server] Starting production server on :${PORT}…`);
const server = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "start", "-p", PORT],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    shell: process.platform === "win32", // Node ≥ 18.20/20.12: .cmd shims need shell
  }
);

const serverLog = [];
server.stdout.on("data", (d) => {
  serverLog.push(d.toString());
  process.stdout.write(d);
});
server.stderr.on("data", (d) => {
  serverLog.push(d.toString());
  process.stderr.write(d);
});

let exited = false;
server.on("exit", (code) => {
  exited = true;
  if (code && code !== 0) {
    console.error(`[test-with-server] Server exited with code ${code}`);
  }
});

// Kill the whole process tree on Ctrl+C / termination
function killServer() {
  if (exited) return;
  exited = true;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {
      /* already gone */
    }
    return;
  }
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}
process.on("SIGINT", () => {
  killServer();
  process.exit(130);
});
process.on("SIGTERM", () => {
  killServer();
  process.exit(143);
});

(async () => {
  try {
    console.log(`[test-with-server] Waiting for ${BASE_URL}/api/health …`);
    await waitForHealth(`${BASE_URL}/api/health`);
    console.log("[test-with-server] Server is healthy ✓");

    const vitestArgs = WATCH ? ["vitest"] : ["vitest", "run"];
    const test = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      vitestArgs,
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, TEST_BASE_URL: BASE_URL },
        shell: process.platform === "win32",
      }
    );

    test.on("exit", (code) => {
      killServer();
      process.exit(code ?? 1);
    });
  } catch (err) {
    console.error(`[test-with-server] ${err.message}`);
    console.error("[test-with-server] Last server output:");
    console.error(serverLog.join("").slice(-4_000));
    killServer();
    process.exit(1);
  }
})();
