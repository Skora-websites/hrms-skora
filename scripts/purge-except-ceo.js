#!/usr/bin/env node
/**
 * KEEP-ONLY-CEO purge.
 *
 * DRY-RUN by default:  node scripts/purge-except-ceo.js
 * Execute for real:    node scripts/purge-except-ceo.js --yes
 *
 * Resolves the CEO account from (first match wins):
 *   1. --ceo-email you@domain.com flag
 *   2. the super_admin entry inside HRMS_ACCOUNT_ROLES_JSON (.env.local)
 *   3. SUPER_ADMIN_EMAIL (.env.local / environment)
 *
 * Deletes EVERY other user plus their dependent documents (sessions,
 * notifications, leave requests/balances, attendance, onboarding tasks,
 * payroll, offer letters, tasks, tickets, documents, audit logs). Everything
 * deleted is first written to scripts/backup-purge.json so a restore is
 * always possible. The CEO account itself is never deleted and is force-synced
 * to role=super_admin / status=active / loginStatus=enabled.
 *
 * Requires MONGODB_URI in .env.local (or the environment).
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const EXECUTE = process.argv.includes("--yes");
const flagIdx = process.argv.indexOf("--ceo-email");
const CEO_EMAIL_FLAG = flagIdx >= 0 ? process.argv[flagIdx + 1] : null;

// ── Load .env.local manually (no dotenv dependency needed) ──
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function parseAccountRoles(raw) {
  if (!raw) return {};
  let v = raw.trim();
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
  try { return JSON.parse(v) || {}; } catch { return {}; }
}

const accountRoles = parseAccountRoles(process.env.HRMS_ACCOUNT_ROLES_JSON);
const ceoFromRoles = Object.entries(accountRoles).find(([, a]) => a && a.role === "super_admin");
const CEO_EMAIL = (
  CEO_EMAIL_FLAG ||
  (ceoFromRoles && ceoFromRoles[0]) ||
  process.env.SUPER_ADMIN_EMAIL ||
  ""
).toLowerCase().trim();

if (!CEO_EMAIL || !CEO_EMAIL.includes("@")) {
  console.error(
    "CEO email could not be determined.\n" +
      "Pass it explicitly: node scripts/purge-except-ceo.js --ceo-email ceo@yourdomain.com"
  );
  process.exit(1);
}

if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes("<")) {
  console.error("MONGODB_URI missing. Add it to .env.local first.");
  process.exit(1);
}

// ── SRV resolution (mirrors lib/mongodb.ts and the other scripts) ──
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
  console.log("[purge] Connecting (SRV resolved via Google DNS)…");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: uriWantsTls(uri) });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");

  const usersColl = db.collection("users");
  const allUsers = await usersColl.find({}).toArray();
  const ceo = allUsers.find((u) => String(u.email || "").toLowerCase().trim() === CEO_EMAIL);
  if (!ceo) {
    console.error(`[purge] CEO account ${CEO_EMAIL} NOT FOUND in users — aborting, nothing deleted.`);
    await client.close();
    process.exit(1);
  }

  const victims = allUsers.filter((u) => u._id.toString() !== ceo._id.toString());
  const victimIds = victims.map((u) => u._id);
  const victimIdStrs = victims.map((u) => u._id.toString());
  const victimEmails = victims.map((u) => String(u.email || "").toLowerCase()).filter(Boolean);

  console.log(`Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN (no changes)"}`);
  console.log(`Keeping CEO: ${CEO_EMAIL} (stored role: ${ceo.role || "?"})`);
  console.log(`Removing ${victims.length} user(s):`);
  for (const v of victims) console.log(`  - ${v.email} (${v.role || "?"})`);

  // userId stored as ObjectId OR string in older rows — cover both.
  const byUser = {
    $or: [{ userId: { $in: victimIdStrs } }, { userId: { $in: victimIds } }],
  };
  const byUserOrEmail = {
    $or: [
      { userId: { $in: victimIdStrs } },
      { userId: { $in: victimIds } },
      { email: { $in: victimEmails } },
      { userEmail: { $in: victimEmails } },
    ],
  };

  // One plan entry per collection (deduped). Order matters only for clarity.
  const plan = new Map();
  plan.set("users", { _id: { $in: victimIds } });
  plan.set("sessions", byUser);
  plan.set("password_resets", byUser);
  plan.set("notifications", byUser);
  for (const coll of ["employee_onboarding_tasks", "employeeOnboardingTasks"]) {
    plan.set(coll, byUserOrEmail);
  }
  for (const coll of [
    "leave_requests",
    "leave_balances",
    "leave_balance_history",
    "attendance",
    "attendance_stats",
    "regularization_requests",
    "employee_jobs",
    "employee_details",
    "employee_salaries",
    "payroll_transactions",
    "tasks",
    "tickets",
    "timesheets",
    "documents",
    "offerletters",
    "offerLetters",
    "assets",
    "performance_goals",
    "audit_logs",
  ]) {
    plan.set(coll, byUserOrEmail);
  }

  const backup = {};
  let total = 0;
  console.log("\n── Deletion plan ──");
  for (const [coll, filter] of plan) {
    let docs = [];
    try {
      docs = await db.collection(coll).find(filter).toArray();
    } catch (e) {
      console.log(`  ${coll}: skipped (${e.message})`);
      continue;
    }
    console.log(`  ${coll}: ${docs.length} doc(s)`);
    if (docs.length) {
      backup[coll] = docs;
      total += docs.length;
    }
  }
  console.log(`\nTotal documents to delete: ${total}`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN only. Re-run with --yes to execute.");
    await client.close();
    return;
  }

  fs.writeFileSync(
    path.join(__dirname, "backup-purge.json"),
    JSON.stringify({ backedUpAt: new Date().toISOString(), ceoEmail: CEO_EMAIL, collections: backup }, null, 2)
  );
  console.log("Backup written to scripts/backup-purge.json");

  for (const [coll, filter] of plan) {
    if (!backup[coll] || !backup[coll].length) continue;
    const res = await db.collection(coll).deleteMany(filter);
    if (res.deletedCount) console.log(`deleted ${coll}: ${res.deletedCount}`);
  }

  // Force-sync the CEO account so role/status gates always pass.
  await usersColl.updateOne(
    { _id: ceo._id },
    { $set: { role: "super_admin", status: "active", loginStatus: "enabled", updatedAt: new Date() } }
  );
  console.log(`\nCEO synced → role=super_admin, status=active, loginStatus=enabled`);

  const rem = await usersColl.find({}).project({ email: 1, role: 1 }).toArray();
  console.log(`\nRemaining users (${rem.length}):`);
  for (const u of rem) console.log(`  ${u.email} (${u.role})`);

  await client.close();
  console.log("\n[purge] Done. Demo data ke liye: node scripts/seed-demo-data.js");
}

main().catch((e) => {
  console.error("[purge] FAILED:", e.message);
  process.exit(1);
});
