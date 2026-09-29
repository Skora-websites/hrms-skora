#!/usr/bin/env node
/**
 * PURGE STALE TEST ONBOARDING + OFFER-LETTER ENTRIES.
 *
 * DRY-RUN by default:  node scripts/purge-test-onboarding.js
 * Execute for real:    node scripts/purge-test-onboarding.js --yes
 *
 * Cleans the CEO dashboard by deleting known test artifacts:
 *   - employee_onboarding_tasks rows with @test.example.com emails
 *     (legacy E2E/regression runs) plus two known debug rows
 *     (debug-pass-emp@company.com, imgprobe-*@company.com)
 *   - offerletters rows with @test.example.com emails
 *
 * Everything deleted is first written to scripts/backup-onboarding-purge.json
 * so a restore is always possible.
 *
 * Requires MONGODB_URI in .env.local (or the environment).
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const EXECUTE = process.argv.includes("--yes");

// ── Load .env.local manually (no dotenv dependency needed) ──
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

// Emails ending in the E2E test domain, plus two known debug @company.com rows.
const testDomain = { email: { $regex: /@test\.example\.com$/i.source, $options: "i" } };
const debugRows = {
  $or: [
    { email: "debug-pass-emp@company.com" },
    { email: { $regex: /^imgprobe-\d+@company\.com$/i.source, $options: "i" } },
  ],
};
const ONBOARDING_FILTER = { $or: [testDomain, debugRows] };
// offerLetters stores the applicant under employeeEmail.
const OFFER_TEST_FILTER = { employeeEmail: { $regex: /@test\.example\.com$/i.source, $options: "i" } };

async function main() {
  const { MongoClient } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const uri = await resolveSRV(process.env.MONGODB_URI);
  console.log("[purge-onboarding] Connecting (SRV resolved via Google DNS)…");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: uriWantsTls(uri) });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");

  const backup = {};
  let totalDeleted = 0;
  const plan = [
    ["employee_onboarding_tasks", ONBOARDING_FILTER],
    ["employeeOnboardingTasks", ONBOARDING_FILTER],
    ["offerletters", OFFER_TEST_FILTER],
    ["offerLetters", OFFER_TEST_FILTER],
  ];

  console.log(`Mode: ${EXECUTE ? "EXECUTE (deleting!)" : "DRY-RUN (no changes)"}`);

  for (const [coll, filter] of plan) {
    try {
      const docs = await db.collection(coll).find(filter).toArray();
      if (docs.length === 0) {
        console.log(`  ${coll}: 0 matching test entries`);
        continue;
      }
      console.log(`  ${coll}: ${docs.length} @test.example.com entries found`);
      backup[coll] = docs.map((d) => ({ _id: d._id.toString(), ...d }));

      if (EXECUTE) {
        const res = await db.collection(coll).deleteMany(filter);
        console.log(`    deleted: ${res.deletedCount}`);
        totalDeleted += res.deletedCount;
      }
    } catch (e) {
      console.log(`  ${coll}: skipped (${e.message})`);
    }
  }

  if (EXECUTE && totalDeleted > 0) {
    const backupPath = path.join(__dirname, "backup-onboarding-purge.json");
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\n[purge-onboarding] Backup written: ${backupPath} (${totalDeleted} docs)`);
  }

  console.log(
    EXECUTE
      ? `[purge-onboarding] Done. Deleted ${totalDeleted} stale test entries.`
      : "[purge-onboarding] Dry-run complete. Re-run with --yes to delete."
  );

  await client.close();
}

main().catch((e) => {
  console.error("[purge-onboarding] FAILED:", e.message);
  process.exit(1);
});
