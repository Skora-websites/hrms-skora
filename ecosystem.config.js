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
      instances: "max", // Utilizes all available CPU cores on aaPanel VPS
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
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
