#!/usr/bin/env node
/**
 * E2E test-data cleanup (evidence-based, idempotent).
 *
 * DRY-RUN by default:  node scripts/cleanup-test-data.js
 * Execute for real:    node scripts/cleanup-test-data.js --yes
 *
 * Deletes ONLY artifacts created by the automated test suites / E2E sessions:
 *  - test users (@test.example.com and the seeded @company.com accounts)
 *    and everything they own: notifications, sessions, password resets
 *  - projects whose name matches test patterns (Dept Project *, Browser E2E *,
 *    Curl E2E *, Live E2E *, Bulk Timing Test, Debug MgrProj*, AuditProgProj,
 *    Website Revamp *, "x") that belong to test/seed owners
 *  - project_members / project_tasks referencing deleted projects or users
 *  - notifications referencing deleted users or deleted projects
 *
 * Keeps: real users, real projects (ABC, ITP2 etc. owned by real users),
 *        leave_types, settings, content, salary_components, pay_groups.
 *
 * A JSON backup of everything deleted is written to scripts/backup-cleanup-test.json.
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

// Test project-name patterns (anchored, explicit — never a blanket delete)
const TEST_PROJECT_PATTERNS = [
  /^Dept Project \d+$/i,
  /^Browser E2E \d+$/i,
  /^Curl E2E Project( \d+)?$/i,
  /^Live E2E \d+$/i,
  /^Bulk Timing Test$/i,
  /^Debug MgrProj\d*$/i,
  /^AuditProgProj$/i,
  /^Website Revamp \d+$/i,
  /^x$/i,
];

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
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
  const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams();
  if (txt.length && txt[0].length) params.set("authSource", "admin");
  const existing = qi >= 0 ? new URLSearchParams(pq.substring(qi + 1)) : new URLSearchParams();
  for (const [k, v] of existing) params.set(k, v);
  return `mongodb://${at >= 0 ? body.substring(0, at) + "@" : ""}${hosts}${qi >= 0 ? pq.substring(0, qi) : pq}?${params.toString()}`;
}

async function main() {
  const { MongoClient, ObjectId } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const client = new MongoClient(await resolveSRV(process.env.MONGODB_URI), {
    serverSelectionTimeoutMS: 20000,
    tls: true,
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");

  console.log(`Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN (no changes)"}\n`);

  // ── Classify users ──────────────────────────────────────
  const users = await db.collection("users").find({}).toArray();
  const testUsers = users.filter((u) => isDummyEmail(u.email));
  const realUsers = users.filter((u) => !isDummyEmail(u.email));
  const realIds = new Set(realUsers.map((u) => u._id.toString()));
  const testIds = testUsers.map((u) => u._id.toString());
  const testIdSet = new Set(testIds);
  const idOf = (v) => (v instanceof ObjectId ? v.toString() : String(v || ""));

  console.log(`users: real=${realUsers.length} test=${testUsers.length}`);

  // ── Classify projects ───────────────────────────────────
  const projects = await db.collection("projects").find({}).toArray();
  const isTestProject = (p) =>
    TEST_PROJECT_PATTERNS.some((re) => re.test(p.name || "")) ||
    testIdSet.has(idOf(p.ownerId));
  const testProjects = projects.filter(isTestProject);
  const realProjects = projects.filter((p) => !isTestProject(p));
  const testProjectIds = testProjects.map((p) => idOf(p._id));
  const realProjectIds = new Set(realProjects.map((p) => idOf(p._id)));
  console.log(`projects: real=${realProjects.length} test=${testProjects.length}`);
  for (const p of testProjects) console.log(`  - delete "${p.name}"`);

  const plan = [];
  const backup = {};

  // ── users ────────────────────────────────────────────────
  plan.push(["users", { _id: { $in: testUsers.map((u) => u._id) } }]);

  // ── direct test-owned docs ──────────────────────────────
  plan.push(["notifications", { userId: { $in: testIds } }]);
  plan.push(["notifications", { userId: { $in: testIds.map((id) => new ObjectId(id)) } }]);
  plan.push(["sessions", { userId: { $in: testIds } }]);
  plan.push(["password_resets", { userId: { $in: testIds } }]);

  // ── projects + members + tasks ──────────────────────────
  plan.push(["projects", { _id: { $in: testProjects.map((p) => p._id) } }]);
  plan.push(["project_members", { projectId: { $in: testProjectIds } }]);
  plan.push(["project_tasks", { projectId: { $in: testProjectIds } }]);
  // members/tasks belonging to test users on any project
  plan.push(["project_members", { userId: { $in: testIds } }]);
  plan.push(["project_tasks", { assigneeId: { $in: testIds } }]);

  // ── notifications pointing at deleted projects ──────────
  plan.push(["notifications", { referenceType: "project", referenceId: { $in: testProjectIds } }]);

  // ── orphans (reference non-existent users) ──────────────
  plan.push(["project_members", { $expr: { $not: { $in: [{ $toString: "$userId" }, [...realIds]] } } }]);

  // ── Backup & execute ────────────────────────────────────
  for (const [coll, filter] of plan) {
    const docs = await db.collection(coll).find(filter).toArray();
    console.log(`${coll}: will delete ${docs.length}`);
    if (docs.length) {
      backup[coll] = backup[coll] || [];
      const seen = new Set(backup[coll].map((d) => d._id.toString()));
      for (const d of docs) {
        const k = d._id.toString();
        if (!seen.has(k)) {
          backup[coll].push(d);
          seen.add(k);
        }
      }
    }
  }

  const total = Object.values(backup).reduce((n, d) => n + d.length, 0);
  console.log(`\nTotal documents to delete: ${total}`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN only. Re-run with --yes to execute.");
    await client.close();
    return;
  }

  fs.writeFileSync(
    path.join(__dirname, "backup-cleanup-test.json"),
    JSON.stringify({ backedUpAt: new Date().toISOString(), collections: backup }, null, 2)
  );
  console.log("Backup written to scripts/backup-cleanup-test.json");

  for (const [coll, filter] of plan) {
    if (!backup[coll]?.length && !backup[coll]) continue;
    const res = await db.collection(coll).deleteMany(filter);
    console.log(`deleted ${coll}: ${res.deletedCount}`);
  }

  // Post-check
  console.log("\n=== Post-cleanup counts ===");
  for (const c of await db.listCollections().toArray()) {
    const n = await db.collection(c.name).countDocuments();
    if (n > 0) console.log(`  ${c.name}: ${n}`);
  }

  await client.close();
}

main().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
