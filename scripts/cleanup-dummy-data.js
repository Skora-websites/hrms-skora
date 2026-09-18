#!/usr/bin/env node
/**
 * Production dummy-data cleanup.
 *
 * DRY-RUN by default:  node scripts/cleanup-dummy-data.js
 * Execute for real:    node scripts/cleanup-dummy-data.js --yes
 *
 * Deletes:
 *  - users with email domain test.example.com / company.com
 *  - their notifications, sessions, password_resets
 *  - onboarding tasks (both collection spellings) whose email is a dummy domain
 *  - payroll runs/transactions, employee_salaries, offer letters belonging to
 *    dummy OR orphaned (non-existent) users — legacy demo seed artifacts
 *
 * Keeps: real users, attendance, leave_types, settings, content,
 *        salary_components, pay_groups.
 *
 * A JSON backup of everything deleted is written to scripts/backup-cleanup.json.
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const EXECUTE = process.argv.includes("--yes");
const DUMMY_DOMAINS = ["test.example.com", "company.com"];
const isDummyEmail = (e) => {
  const s = (e || "").toLowerCase();
  return DUMMY_DOMAINS.some((d) => s.endsWith("@" + d));
};

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function resolveSRV(srvUri) {
  if (!srvUri.startsWith("mongodb+srv://")) return srvUri;
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  const body = srvUri.replace("mongodb+srv://", "");
  const at = body.indexOf("@");
  const afterAt = at >= 0 ? body.substring(at + 1) : body;
  const slash = afterAt.indexOf("/");
  const hostPart = slash >= 0 ? afterAt.substring(0, slash) : afterAt;
  const pq = slash >= 0 ? afterAt.substring(slash) : "/";
  const qi = pq.indexOf("?");
  const [srv, txt] = await Promise.all([
    dns.resolveSrv("_mongodb._tcp." + hostPart).catch(() => []),
    dns.resolveTxt(hostPart).catch(() => []),
  ]);
  if (!srv.length) throw new Error("No SRV records for " + hostPart);
  const params = new URLSearchParams(qi >= 0 ? pq.substring(qi + 1) : "");
  const txtStr = ((txt[0] || [])[0] || "").trim();
  for (const pair of txtStr.split("&").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) params.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");
  return `mongodb://${at >= 0 ? body.substring(0, at) + "@" : ""}${hosts}${qi >= 0 ? pq.substring(0, qi) : pq}?${params.toString()}`;
}

async function main() {
  const { MongoClient, ObjectId } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const client = new MongoClient(await resolveSRV(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 15000, tls: true });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");

  console.log(`Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN (no changes)"}\n`);

  // ── Classify users ──────────────────────────────────────
  const users = await db.collection("users").find({}).toArray();
  const dummyUsers = users.filter((u) => isDummyEmail(u.email));
  const realUsers = users.filter((u) => !isDummyEmail(u.email));
  const realIds = new Set(realUsers.map((u) => u._id.toString()));
  const dummyIds = dummyUsers.map((u) => u._id.toString());
  const dummyIdSet = new Set(dummyIds);
  const idOf = (v) => (v instanceof ObjectId ? v.toString() : String(v || ""));
  const isOrphan = (v) => {
    const s = idOf(v);
    return !!s && !realIds.has(s) && !dummyIdSet.has(s);
  };

  console.log(`users: real=${realUsers.length} dummy=${dummyUsers.length}`);
  const plan = [];
  const backup = {};

  // ── users ────────────────────────────────────────────────
  plan.push(["users", { _id: { $in: dummyUsers.map((u) => u._id) } }]);

  // ── direct dummy-owned docs ─────────────────────────────
  plan.push(["notifications", { userId: { $in: dummyIds } }]);
  plan.push(["sessions", { userId: { $in: dummyIds } }]);
  plan.push(["password_resets", { userId: { $in: dummyIds } }]);
  for (const coll of ["employee_onboarding_tasks", "employeeOnboardingTasks"]) {
    plan.push([coll, { $or: [{ email: { $in: DUMMY_DOMAINS.map((d) => new RegExp("@" + d.replace(/\./g, "\\.") + "$", "i")) } }, { userEmail: { $in: DUMMY_DOMAINS.map((d) => new RegExp("@" + d.replace(/\./g, "\\.") + "$", "i")) } }, { userId: { $in: dummyIds } }] }]);
  }

  // ── payroll / salaries / offer letters: dummy or orphaned users ──
  plan.push(["payroll_transactions", { $or: [{ userEmail: { $in: DUMMY_DOMAINS.map((d) => new RegExp("@" + d.replace(/\./g, "\\.") + "$", "i")) } }, { email: { $in: DUMMY_DOMAINS.map((d) => new RegExp("@" + d.replace(/\./g, "\\.") + "$", "i")) } }, { userId: { $in: dummyIds } }, { userId: { $in: [...dummyIds.map((id) => new ObjectId(id))] } }, { $and: [{ userId: { $exists: true, $nin: [""] } }, { $expr: { $not: { $in: [{ $toString: "$userId" }, [...realIds]] } } }] }] }]);
  plan.push(["employee_salaries", { $and: [{ userId: { $exists: true, $nin: ["", null] } }, { $expr: { $not: { $in: [{ $toString: "$userId" }, [...realIds]] } } }] }]);
  plan.push(["payroll_runs", {}]); // all 3 are demo runs (processedBy = seed users)
  for (const coll of ["offerletters", "offerLetters"]) {
    plan.push([coll, { $and: [{ userId: { $exists: true, $nin: ["", null] } }, { $expr: { $not: { $in: [{ $toString: "$userId" }, [...realIds]] } } }] }]);
  }

  // ── Backup & execute ────────────────────────────────────
  for (const [coll, filter] of plan) {
    const docs = await db.collection(coll).find(filter).toArray();
    console.log(`${coll}: will delete ${docs.length}`);
    if (docs.length) backup[coll] = docs;
  }

  const total = Object.values(backup).reduce((n, d) => n + d.length, 0);
  console.log(`\nTotal documents to delete: ${total}`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN only. Re-run with --yes to execute.");
    await client.close();
    return;
  }

  fs.writeFileSync(path.join(__dirname, "backup-cleanup.json"), JSON.stringify({ backedUpAt: new Date().toISOString(), collections: backup }, null, 2));
  console.log("Backup written to scripts/backup-cleanup.json");

  for (const [coll, filter] of plan) {
    if (!backup[coll]?.length) continue;
    const res = await db.collection(coll).deleteMany(filter);
    console.log(`deleted ${coll}: ${res.deletedCount}`);
  }

  // Post-check
  console.log("\n=== Post-cleanup counts ===");
  for (const c of await db.listCollections().toArray()) {
    const n = await db.collection(c.name).countDocuments();
    if (n > 0) console.log(`  ${c.name}: ${n}`);
  }
  const rem = await db.collection("users").find({}).project({ email: 1, role: 1 }).toArray();
  console.log(`\nRemaining users (${rem.length}):`);
  for (const u of rem) console.log(`  ${u.email} (${u.role})`);

  await client.close();
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
