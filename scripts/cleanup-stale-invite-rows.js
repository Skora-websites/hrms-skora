#!/usr/bin/env node
/**
 * CLEANUP stale test-domain onboarding request rows from the database.
 *
 * DRY-RUN by default:  node scripts/cleanup-stale-invite-rows.js
 * Execute for real:    node scripts/cleanup-stale-invite-rows.js --yes
 *
 * Removes employee_onboarding_tasks rows whose email ends in
 * @test.example.com (the E2E suite's synthetic domain) that were left
 * behind as invite_requested/pending/rejected by test runs. Real
 * applicants never use this domain, so production data is untouched.
 *
 * Requires MONGODB_URI in .env.local (or the environment).
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const EXECUTE = process.argv.includes("--yes");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("<")) {
  console.error("MONGODB_URI missing. Add it to .env.local first.");
  process.exit(1);
}

// ── SRV resolution (mirrors scripts/seed-test-accounts.js) ──
async function resolveSRV(srvUri) {
  if (!srvUri.startsWith("mongodb+srv://")) return srvUri;
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  const uriBody = srvUri.replace("mongodb+srv://", "");
  const atIndex = uriBody.indexOf("@");
  const credentials = atIndex >= 0 ? uriBody.substring(0, atIndex) : "";
  const afterAt = atIndex >= 0 ? uriBody.substring(atIndex + 1) : uriBody;
  const slashIndex = afterAt.indexOf("/");
  const hostPart = slashIndex >= 0 ? afterAt.substring(0, slashIndex) : afterAt;
  const pathAndQuery = slashIndex >= 0 ? afterAt.substring(slashIndex) : "/";
  const queryIndex = pathAndQuery.indexOf("?");
  const dbPath = queryIndex >= 0 ? pathAndQuery.substring(0, queryIndex) : pathAndQuery;
  const existingQuery = queryIndex >= 0 ? pathAndQuery.substring(queryIndex + 1) : "";

  const [srvRecords, txtRecords] = await Promise.all([
    dns.resolveSrv("_mongodb._tcp." + hostPart).catch(() => []),
    dns.resolveTxt(hostPart).catch(() => []),
  ]);
  if (srvRecords.length === 0) throw new Error("No SRV records for " + hostPart);

  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams(existingQuery);
  const txtStr = ((txtRecords[0] || [])[0] || "").trim();
  for (const pair of txtStr.split("&").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) params.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return `mongodb://${credentials}@${hosts}${dbPath}?${params.toString()}`;
}

function uriWantsTls(uri) {
  const q = uri.split("?")[1] || "";
  const params = new URLSearchParams(q);
  const explicit = params.get("tls") || params.get("ssl");
  if (explicit) return explicit === "true";
  return true;
}

async function main() {
  const { MongoClient } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const uri = await resolveSRV(process.env.MONGODB_URI);
  console.log(`[cleanup] Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN"}`);
  console.log("[cleanup] Connecting (SRV resolved via Google DNS)…");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: uriWantsTls(uri) });
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "hrms").collection("employee_onboarding_tasks");

  const query = { email: { $regex: /@test\.example\.com$/i }, status: { $in: ["invite_requested", "pending", "rejected"] } };
  const rows = await col.find(query, { projection: { email: 1, status: 1 } }).toArray();
  console.log(`[cleanup] Matching stale test rows: ${rows.length}`);

  if (rows.length > 0 && EXECUTE) {
    const backupPath = path.join(__dirname, "backup-stale-invite-rows.json");
    fs.writeFileSync(backupPath, JSON.stringify({ deletedAt: new Date(), rows }, null, 2));
    console.log(`[cleanup] Backup written: ${backupPath}`);
    const r = await col.deleteMany(query);
    console.log(`[cleanup] Deleted ${r.deletedCount} row(s)`);
  } else if (rows.length > 0) {
    for (const row of rows.slice(0, 5)) console.log(`  - ${row.email} (${row.status})`);
    if (rows.length > 5) console.log(`  … and ${rows.length - 5} more`);
    console.log("[cleanup] No changes made (dry-run). Re-run with --yes to delete.");
  }
  await client.close();
  process.exit(0);
}

main().catch(e => { console.error("[cleanup]", e.message); process.exit(1); });
