#!/usr/bin/env node
/**
 * READ-ONLY inspection of the production DB — prints counts and samples
 * so we can identify dummy data before deleting anything.
 *   node scripts/inspect-db.js
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

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

async function main() {
  const { MongoClient } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const uri = await resolveSRV(process.env.MONGODB_URI);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: true });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");
  console.log("Database:", db.databaseName);

  const collections = await db.listCollections().toArray();
  console.log("\n=== Collections & counts ===");
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  ${c.name}: ${count}`);
  }

  // Users breakdown
  const users = db.collection("users");
  const total = await users.countDocuments();
  console.log(`\n=== users (${total} total) ===`);
  const byRole = await users.aggregate([{ $group: { _id: "$role", n: { $sum: 1 } } }]).toArray();
  console.log("By role:", byRole.map((r) => `${r._id}: ${r.n}`).join(", "));

  const byDomain = await users
    .aggregate([{ $project: { domain: { $arrayElemAt: [{ $split: ["$email", "@"] }, 1] } } }, { $group: { _id: "$domain", n: { $sum: 1 } } }, { $sort: { n: -1 } }])
    .toArray();
  console.log("By email domain:", byDomain.map((r) => `${r._id}: ${r.n}`).join(", "));

  // Sample first 15 + super admins in full
  console.log("\n--- super_admin accounts ---");
  for (const u of await users.find({ role: "super_admin" }).project({ email: 1, displayName: 1, status: 1, createdAt: 1 }).toArray()) {
    console.log(`  ${u.email} | ${u.displayName} | status=${u.status} | created=${u.createdAt?.toISOString?.() || u.createdAt}`);
  }
  console.log("\n--- first 20 non-admin users (sample) ---");
  for (const u of await users.find({ role: { $nin: ["super_admin", "superadmin"] } }).sort({ createdAt: 1 }).limit(20).project({ email: 1, displayName: 1, role: 1, status: 1, createdAt: 1 }).toArray()) {
    console.log(`  ${u.email} | ${u.displayName} | ${u.role} | ${u.status} | ${u.createdAt?.toISOString?.() || u.createdAt}`);
  }

  await client.close();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
