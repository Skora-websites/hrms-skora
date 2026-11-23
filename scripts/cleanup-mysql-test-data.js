#!/usr/bin/env node
/**
 * =============================================================================
 * SKORA HRMS Production & Local MySQL Dummy/Test Data Cleaner
 * =============================================================================
 * Safely removes all test, demo, and mock artifacts across all tables while
 * strictly preserving authentic corporate users and their actual records.
 *
 * Usage:
 *   node scripts/cleanup-mysql-test-data.js           # DRY-RUN (report only)
 *   node scripts/cleanup-mysql-test-data.js --yes     # EXECUTE (permanent cleanup)
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  const envFiles = [".env", ".env.production", ".env.local"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  }
}

loadEnv();

function parseDbUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname.replace(/^\//, "") || "hrms",
    };
  } catch {
    return null;
  }
}

const parsedFromUrl = parseDbUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);
const MYSQL_HOST = parsedFromUrl?.host || process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = parsedFromUrl?.port || Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = parsedFromUrl?.user || process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = parsedFromUrl ? parsedFromUrl.password : (process.env.MYSQL_PASSWORD ?? "");
const MYSQL_DATABASE = parsedFromUrl?.database || process.env.MYSQL_DATABASE || "hrms";

const EXECUTE = process.argv.includes("--yes");

async function main() {
  console.log(`\n=======================================================`);
  console.log(`🧹 SKORA HRMS Database Test/Mock Data Cleaner`);
  console.log(`=======================================================`);
  console.log(`Connecting to MySQL database "${MYSQL_DATABASE}" at ${MYSQL_HOST}:${MYSQL_PORT}...`);
  console.log(`Mode: ${EXECUTE ? "🚀 EXECUTE (Applying permanent changes)" : "🔍 DRY-RUN (Preview only, use --yes to execute)"}\n`);

  const conn = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    multipleStatements: true,
  });

  try {
    const [allUsers] = await conn.query("SELECT id, legacyId, email, role, firstName, lastName FROM users");
    const isDummyEmail = (email) => {
      const e = (email || "").toLowerCase().trim();
      return (
        e.endsWith("@company.com") ||
        e.endsWith("@test.example.com") ||
        e.endsWith("@example.com") ||
        e.endsWith("@skora.internal") ||
        e.includes("demo") ||
        e.includes("test") ||
        e.includes("probe") ||
        e.includes("placeholder") ||
        e.includes("dummy")
      );
    };

    const dummyUsers = allUsers.filter((u) => isDummyEmail(u.email));
    const realUsers = allUsers.filter((u) => !isDummyEmail(u.email));

    console.log(`📊 Users audit:`);
    console.log(`   Real corporate accounts found: ${realUsers.length}`);
    realUsers.forEach((u) => console.log(`      ✓ ID ${u.id}: ${u.email} (${u.role})`));
    console.log(`   Dummy / mock accounts to purge: ${dummyUsers.length}\n`);

    if (dummyUsers.length === 0) {
      console.log("✨ No dummy users found in database. Database is already clean!");
      await conn.end();
      return;
    }

    if (EXECUTE) {
      const migrationSql = fs.readFileSync(path.join(__dirname, "..", "migrations", "0002_wipe_test_and_mock_data.sql"), "utf8");
      await conn.query(migrationSql);
      console.log(`✅ Successfully executed cleanup migration!`);

      const [remaining] = await conn.query("SELECT COUNT(*) as count FROM users");
      console.log(`🛡️ Preserved authentic user count: ${remaining[0].count}`);
    } else {
      console.log(`💡 To execute this deletion for real on MySQL, run:`);
      console.log(`   node scripts/cleanup-mysql-test-data.js --yes\n`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
