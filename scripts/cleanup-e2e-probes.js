#!/usr/bin/env node
/**
 * CLEANUP E2E PROBE DATA from the production database.
 *
 * DRY-RUN by default:  node scripts/cleanup-e2e-probes.js
 * Execute for real:    node scripts/cleanup-e2e-probes.js --yes
 *
 * Removes the throwaway rows created by end-to-end offer-letter probes:
 *   - users with the probe email(s) passed via --email (repeatable)
 *   - their offerLetters rows
 *   - their employee_onboarding_tasks rows
 *   - their sessions/notifications
 *
 * Requires MONGODB_URI in .env.local (or the environment).
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const EXECUTE = process.argv.includes("--yes");
const emails = [];
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--email") emails.push(String(process.argv[i + 1] || "").toLowerCase().trim());
}
if (emails.length === 0) {
  console.error("Usage: node scripts/cleanup-e2e-probes.js [--yes] --email probe@company.com [--email ...]");
  process.exit(1);
}

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
  console.log(`[probe-cleanup] Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN"}`);
  console.log(`[probe-cleanup] Probe emails: ${emails.join(", ")}`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: uriWantsTls(uri) });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");

  const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
  const userIds = users.map((u) => u._id.toString());
  console.log(`[probe-cleanup] Found ${users.length} user doc(s): ${userIds.join(", ") || "none"}`);

  const byEmail = { email: { $in: emails } };
  const byEmailAlt = { employeeEmail: { $in: emails } };
  const byUser = { $or: [{ userId: { $in: userIds } }, { userId: { $in: emails } }] };

  const plan = [
    ["users", { email: { $in: emails } }],
    ["offerLetters", { $or: [byEmailAlt, { userId: { $in: userIds } }] }],
    ["employee_onboarding_tasks", byEmail],
    ["employeeOnboardingTasks", byEmail],
    ["sessions", byUser],
    ["notifications", byUser],
    ["leave_requests", byUser],
    ["password_resets", byUser],
    ["email_delivery_log", { to: { $in: emails } }],
  ];

  const backup = {};
  let total = 0;
  for (const [coll, filter] of plan) {
    try {
      const docs = await db.collection(coll).find(filter).toArray();
      if (docs.length === 0) continue;
      console.log(`  ${coll}: ${docs.length} row(s)`);
      backup[coll] = docs.map((d) => ({ _id: d._id.toString(), ...d }));
      if (EXECUTE) {
        const r = await db.collection(coll).deleteMany(filter);
        total += r.deletedCount;
        console.log(`    deleted: ${r.deletedCount}`);
      }
    } catch (e) {
      console.log(`  ${coll}: skipped (${e.message})`);
    }
  }

  if (EXECUTE && total > 0) {
    const backupPath = path.join(__dirname, "backup-e2e-probe-cleanup.json");
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`[probe-cleanup] Backup written: ${backupPath}`);
  }
  console.log(`[probe-cleanup] Done. ${EXECUTE ? `Deleted ${total} row(s).` : "No changes made (dry-run)."}`);
  await client.close();
}

main().catch((e) => {
  console.error("[probe-cleanup] FAILED:", e.message);
  process.exit(1);
});
