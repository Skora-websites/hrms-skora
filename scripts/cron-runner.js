#!/usr/bin/env node
/**
 * Standalone aaPanel Cron Runner Script
 * -------------------------------------------------------------
 * Usage in aaPanel > Cron > Add Task (Shell Script):
 *
 * cd /www/wwwroot/hrms.skorainfotech.com && node scripts/cron-runner.js --job=auto-punchout
 * cd /www/wwwroot/hrms.skorainfotech.com && node scripts/cron-runner.js --job=leave-accrual
 * cd /www/wwwroot/hrms.skorainfotech.com && node scripts/cron-runner.js --job=late-deductions
 * -------------------------------------------------------------
 */

const http = require("http");
const https = require("https");

const args = process.argv.slice(2);
let job = "auto-punchout";
let force = false;

for (const arg of args) {
  if (arg.startsWith("--job=")) {
    job = arg.split("=")[1];
  } else if (arg === "--force") {
    force = true;
  }
}

const CRON_SECRET = process.env.CRON_SECRET || "skora-hrms-cron-secret-2026";
const PORT = process.env.PORT || 3010;
const HOST = process.env.APP_HOST || "127.0.0.1";

const postData = JSON.stringify({ job, force });

const options = {
  hostname: HOST,
  port: PORT,
  path: `/api/hrm/v2/cron/run?job=${job}${force ? "&force=true" : ""}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
    Authorization: `Bearer ${CRON_SECRET}`,
  },
  timeout: 60000,
};

console.log(`[aaPanel Cron] Dispatching job: ${job} to http://${HOST}:${PORT}...`);

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      if (res.statusCode >= 200 && res.statusCode < 300 && json.success) {
        console.log(`[aaPanel Cron] [SUCCESS] Job: ${job} finished in ${json.durationMs}ms`);
        console.log(JSON.stringify(json.results, null, 2));
        process.exit(0);
      } else {
        console.error(`[aaPanel Cron] [FAILED] HTTP ${res.statusCode}:`, json.error || data);
        process.exit(1);
      }
    } catch {
      console.log(`[aaPanel Cron] Received non-JSON response:`, data);
      process.exit(res.statusCode === 200 ? 0 : 1);
    }
  });
});

req.on("error", (e) => {
  console.error(`[aaPanel Cron] [ERROR] Connection failed: ${e.message}`);
  process.exit(1);
});

req.write(postData);
req.end();
