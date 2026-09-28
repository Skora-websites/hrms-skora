#!/usr/bin/env node
/**
 * Demo-data seeder — runs AFTER scripts/purge-except-ceo.js.
 *
 *   node scripts/seed-demo-data.js
 *
 * Creates (idempotent — re-running updates rather than duplicates):
 *  - 3 leave types (Annual 18d, Sick 12d, Casual 7d) — leave apply is
 *    impossible without these rows in `leave_types`.
 *  - 1 manager (manager.demo@company.com) + 2 employees under that manager.
 *  - Reporting-manager links so employee dashboards never say
 *    "Reporting Manager: Not Assigned".
 *  - Current-year leave balances for the CEO and every demo account.
 *
 * Passwords follow the suite convention: Manager@123 / Employee@123.
 * Requires MONGODB_URI in .env.local (or the environment).
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

const LEAVE_TYPES = [
  { name: "Annual Leave", code: "AL", maxBalance: 18, color: "#3b82f6" },
  { name: "Sick Leave", code: "SL", maxBalance: 12, color: "#ef4444" },
  { name: "Casual Leave", code: "CL", maxBalance: 7, color: "#f59e0b" },
];

const DEMO_USERS = [
  {
    email: "manager.demo@company.com",
    role: "manager",
    password: "Manager@123",
    displayName: "Demo Manager",
    department: "Engineering",
    designation: "Engineering Manager",
    employeeCode: "EMP-1001",
    reportingManager: "",
  },
  {
    email: "employee.one@company.com",
    role: "employee",
    password: "Employee@123",
    displayName: "Rahul Sharma",
    department: "Engineering",
    designation: "Software Developer",
    employeeCode: "EMP-1002",
    reportingManager: "Demo Manager",
  },
  {
    email: "employee.two@company.com",
    role: "employee",
    password: "Employee@123",
    displayName: "Priya Verma",
    department: "Quality Assurance",
    designation: "QA Engineer",
    employeeCode: "EMP-1003",
    reportingManager: "Demo Manager",
  },
];

async function main() {
  const { MongoClient } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const uri = await resolveSRV(process.env.MONGODB_URI);
  console.log("[seed-demo] Connecting…");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: uriWantsTls(uri) });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");
  const bcrypt = require(path.join(__dirname, "..", "node_modules", "bcryptjs"));

  const year = new Date().getFullYear();
  const users = db.collection("users");

  // ── Resolve the CEO (kept by the purge script) ──
  let ceo = await users.findOne({ role: "super_admin" });
  if (!ceo) {
    const accountRolesRaw = process.env.HRMS_ACCOUNT_ROLES_JSON || "";
    try {
      const parsed = JSON.parse(accountRolesRaw.trim().replace(/^'|'$/g, ""));
      const ceoEmail = Object.keys(parsed).find((k) => parsed[k]?.role === "super_admin");
      if (ceoEmail) ceo = await users.findOne({ email: ceoEmail.toLowerCase().trim() });
    } catch { /* fall through */ }
  }
  if (!ceo) {
    console.error("[seed-demo] No super_admin/CEO account found — run purge-except-ceo.js first.");
    await client.close();
    process.exit(1);
  }
  const ceoId = ceo._id.toString();
  console.log(`[seed-demo] CEO: ${ceo.email}`);

  // ── Leave types (required for apply + balances UI) ──
  const leaveTypes = db.collection("leave_types");
  const typeIds = {};
  for (const lt of LEAVE_TYPES) {
    const existing = await leaveTypes.findOne({ code: lt.code, tenantId: "default" });
    if (existing) {
      typeIds[lt.code] = existing._id.toString();
      continue;
    }
    const doc = {
      planId: "",
      name: lt.name,
      code: lt.code,
      maxBalance: lt.maxBalance,
      incrementType: "yearly",
      incrementValue: lt.maxBalance,
      isPaid: true,
      requiresApproval: true,
      requiresAttachment: false,
      color: lt.color,
      status: "active",
      tenantId: "default",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const r = await leaveTypes.insertOne(doc);
    typeIds[lt.code] = r.insertedId.toString();
    console.log(`  leave type: ${lt.name} (${lt.maxBalance}d)`);
  }

  // ── Demo manager + employees ──
  const demoIds = {};
  for (const u of DEMO_USERS) {
    const existing = await users.findOne({ email: u.email });
    const base = {
      role: u.role,
      status: "active",
      loginStatus: "enabled",
      displayName: u.displayName,
      firstName: u.displayName.split(" ")[0],
      lastName: u.displayName.split(" ").slice(1).join(" "),
      department: u.department,
      departmentName: u.department,
      designation: u.designation,
      designationName: u.designation,
      employeeCode: u.employeeCode,
      reportingManager: u.reportingManager,
      onboardingStatus: "approved",
      mustChangePassword: false,
      tenantId: "default",
      updatedAt: new Date(),
    };
    if (existing) {
      await users.updateOne({ _id: existing._id }, { $set: base });
      demoIds[u.email] = existing._id.toString();
      console.log(`  user synced: ${u.email} (${u.role})`);
    } else {
      const doc = {
        email: u.email,
        emailVerified: true,
        passwordHash: await bcrypt.hash(u.password, 12),
        joiningDate: new Date(),
        ...base,
        createdAt: new Date(),
      };
      const r = await users.insertOne(doc);
      demoIds[u.email] = r.insertedId.toString();
      console.log(`  user created: ${u.email} (${u.role}) password: ${u.password}`);
    }
  }

  // CEO ka reporting-manager khali hona chahiye (top of the chain).
  await users.updateOne({ _id: ceo._id }, { $set: { reportingManager: "" } });

  // ── Leave balances for CEO + demo users ──
  const balances = db.collection("leave_balances");
  const history = db.collection("leave_balance_history");
  const targets = [
    { id: ceoId, label: ceo.email },
    ...DEMO_USERS.map((u) => ({ id: demoIds[u.email], label: u.email })),
  ];
  let balanceCount = 0;
  for (const t of targets) {
    for (const [code, typeId] of Object.entries(typeIds)) {
      const lt = LEAVE_TYPES.find((x) => x.code === code);
      const existing = await balances.findOne({
        userId: t.id,
        leaveTypeId: typeId,
        year,
        tenantId: "default",
      });
      if (existing) continue;
      const doc = {
        userId: t.id,
        leavePlanId: "",
        leaveTypeId: typeId,
        totalAllocated: lt.maxBalance,
        used: 0,
        pending: 0,
        remaining: lt.maxBalance,
        carriedForward: 0,
        year,
        tenantId: "default",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const r = await balances.insertOne(doc);
      await history.insertOne({
        userId: t.id,
        leaveTypeId: typeId,
        changeType: "allocated",
        amount: lt.maxBalance,
        previousBalance: 0,
        newBalance: lt.maxBalance,
        referenceId: r.insertedId.toString(),
        notes: `Annual allocation ${year} (demo seed)`,
        tenantId: "default",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      balanceCount++;
    }
  }
  console.log(`  leave balances created: ${balanceCount}`);

  await client.close();
  console.log("\n[seed-demo] Done. Login: manager.demo@company.com / Manager@123");
}

main().catch((e) => {
  console.error("[seed-demo] FAILED:", e.message);
  process.exit(1);
});
