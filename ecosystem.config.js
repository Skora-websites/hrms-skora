const fs = require("fs");
const path = require("path");

const hasAapanelLogs = fs.existsSync("/www/wwwlogs");
const logDir = hasAapanelLogs ? "/www/wwwlogs" : path.join(__dirname, "logs");

if (!hasAapanelLogs && !fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch {}
}

function getPort() {
  const envFiles = [".env.production", ".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      const match = content.match(/^PORT\s*=\s*(\d+)/m);
      if (match) return Number(match[1]);
    }
  }
  return Number(process.env.PORT) || 3010;
}

const appPort = getPort();

module.exports = {
  apps: [
    {
      name: "hrms-skora",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${appPort}`,
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: appPort,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: appPort,
      },
      error_file: path.join(logDir, "hrms-skora-error.log"),
      out_file: path.join(logDir, "hrms-skora-out.log"),
      combine_logs: true,
      time: true,
    },
  ],
};
