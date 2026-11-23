const fs = require("fs");
const path = require("path");

const hasAapanelLogs = fs.existsSync("/www/wwwlogs");
const logDir = hasAapanelLogs ? "/www/wwwlogs" : path.join(__dirname, "logs");

if (!hasAapanelLogs && !fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch {}
}

module.exports = {
  apps: [
    {
      name: "hrms-skora",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: path.join(logDir, "hrms-skora-error.log"),
      out_file: path.join(logDir, "hrms-skora-out.log"),
      combine_logs: true,
      time: true,
    },
  ],
};
