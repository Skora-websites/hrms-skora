#!/usr/bin/env node
/**
 * =============================================================================
 * SKORA HRMS Automated Database Migration Runner
 * =============================================================================
 * Automatically tracks and applies incremental SQL migrations from migrations/
 * in filename order (e.g. 0000_init_hrms_core.sql, 0001_enterprise_modules.sql).
 *
 * Designed for aaPanel Git Manager automated deployment and local development.
 *
 * Usage:
 *   node scripts/migrate.js             # Apply all pending migrations
 *   node scripts/migrate.js --status    # View applied vs pending migrations
 *   node scripts/migrate.js --create <slug> # Create a new timestamped/sequential migration
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

// 1. Lightweight Zero-Dependency .env Loader
function loadEnv() {
  const envFiles = [".env", ".env.production", ".env.local"];
  const loaded = [];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      loaded.push(file);
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
          process.env[key] = val;
        }
      });
    }
  }

  if (loaded.length > 0) {
    console.log(`📁 Loaded environment from: ${loaded.join(", ")}`);
  } else {
    console.warn(`⚠️ Warning: No .env, .env.production, or .env.local found in ${process.cwd()}!`);
  }
}

loadEnv();

const MIGRATIONS_DIR = path.resolve(process.cwd(), "migrations");

function parseDbUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname.replace(/^\//, "") || "hrms",
      multipleStatements: true,
    };
  } catch (err) {
    return null;
  }
}

function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    const fromUrl = parseDbUrl(process.env.DATABASE_URL);
    if (fromUrl) return fromUrl;
  }

  return {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD ?? "",
    database: process.env.MYSQL_DATABASE || "hrms",
    multipleStatements: true,
  };
}

async function handleCreate(slug) {
  if (!slug) {
    console.error("❌ Error: Please specify a migration name: npm run db:migrate -- --create <name>");
    process.exit(1);
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const existing = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();

  let nextIndex = 0;
  if (existing.length > 0) {
    const last = existing[existing.length - 1];
    const match = last.match(/^(\d{4})_/);
    if (match) {
      nextIndex = parseInt(match[1], 10) + 1;
    }
  }

  const prefix = String(nextIndex).padStart(4, "0");
  const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const filename = `${prefix}_${sanitizedSlug}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, filename);

  const template = `-- =========================================================================
-- Migration: ${filename}
-- Created: ${new Date().toISOString()}
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Write your schema changes (ALTER TABLE, CREATE TABLE, ADD INDEX, INSERT) here:


SET FOREIGN_KEY_CHECKS = 1;
`;

  fs.writeFileSync(filePath, template, "utf8");
  console.log(`✅ Created new migration file: migrations/${filename}`);
  process.exit(0);
}

async function main() {
  const args = process.argv.slice(2);
  const statusIndex = args.indexOf("--status");
  const createIndex = args.indexOf("--create");

  if (createIndex !== -1) {
    return handleCreate(args[createIndex + 1]);
  }

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  const dbConfig = getConnectionConfig();
  console.log(`📡 Connecting to MySQL database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}...`);

  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
  } catch (err) {
    console.error(`\n❌ Could not connect to MySQL:`, err.message);
    console.error(`💡 Tip: Make sure your .env file exists in "${process.cwd()}" with valid aaPanel MySQL credentials:`);
    console.error(`   MYSQL_HOST=${dbConfig.host}`);
    console.error(`   MYSQL_PORT=${dbConfig.port}`);
    console.error(`   MYSQL_USER=${dbConfig.user}`);
    console.error(`   MYSQL_PASSWORD=${dbConfig.password ? "********" : "(empty)"}`);
    console.error(`   MYSQL_DATABASE=${dbConfig.database}\n`);
    process.exit(1);
  }

  try {
    // 1. Ensure migration tracking table exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`migration_log\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`filename\` VARCHAR(255) NOT NULL,
        \`applied_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_migration_log_filename\` (\`filename\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 2. Fetch already applied migrations
    const [appliedRows] = await conn.execute(
      `SELECT filename, applied_at FROM \`migration_log\` ORDER BY id ASC`
    );
    const appliedMap = new Map(appliedRows.map((r) => [r.filename, r.applied_at]));

    // 3. Scan migrations directory
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql") && /^\d{4}_/.test(f))
      .sort();

    const strays = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql") && !/^\d{4}_/.test(f));
    if (strays.length > 0) {
      console.warn(`⚠️ Warning: Found non-prefixed SQL files in migrations/ that will not be applied automatically:`);
      strays.forEach((s) => console.warn(`   - ${s}`));
    }

    const pending = files.filter((f) => !appliedMap.has(f));

    // Handle --status
    if (statusIndex !== -1) {
      console.log("\n📋 Applied Migrations:");
      if (appliedMap.size === 0) {
        console.log("   (No migrations applied yet)");
      } else {
        for (const [fn, date] of appliedMap.entries()) {
          console.log(`   ✔ ${fn} (applied on ${new Date(date).toLocaleString()})`);
        }
      }

      console.log("\n⏳ Pending Migrations:");
      if (pending.length === 0) {
        console.log("   ✔ None! Database is up to date.");
      } else {
        for (const fn of pending) {
          console.log(`   • ${fn}`);
        }
      }
      return;
    }

    if (pending.length === 0) {
      console.log(`✨ Database is up to date. (All ${files.length} migrations applied).`);
      return;
    }

    console.log(`🚀 Found ${pending.length} pending migration(s) to apply:\n`);

    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const rawSql = fs.readFileSync(filePath, "utf8").trim();

      if (!rawSql) {
        console.log(`⏩ Skipping empty migration: ${file}`);
        await conn.execute(`INSERT INTO \`migration_log\` (\`filename\`) VALUES (?)`, [file]);
        continue;
      }

      process.stdout.write(`⏳ Applying ${file}... `);
      const startTime = Date.now();

      try {
        await conn.query(rawSql);
        await conn.execute(`INSERT INTO \`migration_log\` (\`filename\`) VALUES (?)`, [file]);
        const elapsedMs = Date.now() - startTime;
        console.log(`✔ Success (${elapsedMs}ms)`);
      } catch (sqlErr) {
        console.log(`❌ FAILED!`);
        console.error(`\n💥 Error executing migration ${file}:`);
        console.error(sqlErr.message);
        console.error(`\nMigration process aborted. Database remained at last successful state.`);
        process.exit(1);
      }
    }

    console.log(`\n🎉 All migrations applied successfully!`);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
