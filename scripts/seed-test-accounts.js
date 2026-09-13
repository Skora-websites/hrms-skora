#!/usr/bin/env node
/**
 * Non-destructive test-account seeder.
 *
 * Ensures every account used by the e2e suite (__tests__/*) exists with the
 * expected role and password. Existing documents are NEVER deleted — only
 * role / password / status / displayName are synchronized for these test
 * accounts, so real users are untouched.
 *
 * Uses the same Google-DNS SRV resolution trick as lib/mongodb.ts so it
 * works from machines where the driver's built-in SRV lookup fails.
 *
 * Usage:
 *   node scripts/seed-test-accounts.js              # ensure + report
 *   node scripts/seed-test-accounts.js --with-email # also send a welcome email
 *
 * Requires MONGODB_URI in .env.local (or the environment).
 */
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

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

// ── Suite accounts (parsed from __tests__ to stay in sync) ──
const { execSync } = require("child_process");
const testsDir = path.join(__dirname, "..", "__tests__");
const emails = new Set();
for (const f of fs.readdirSync(testsDir)) {
  if (!f.endsWith(".test.ts")) continue;
  const src = fs.readFileSync(path.join(testsDir, f), "utf8");
  for (const m of src.matchAll(/"([a-z0-9.-]+@company\.com)"/g)) emails.add(m[1]);
}

function roleFor(email) {
  if (email.startsWith("superadmin")) return "super_admin";
  if (email.startsWith("hr-admin")) return "hr_admin";
  if (email.startsWith("manager")) return "manager";
  return "employee";
}

const PASSWORDS = {
  super_admin: "SuperAdmin@123",
  hr_admin: "HRAdmin@123",
  manager: "Manager@123",
  employee: "Employee@123",
};

// ── SRV resolution (mirrors lib/mongodb.ts) ──
async function resolveSRV(srvUri) {
  if (!srvUri.startsWith("mongodb+srv://")) return srvUri;
  dns.setServers ? null : null;
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
  for (const kv of (txtRecords[0] || []).join("")) {
    // txtRecords[0][0] is a single string like "authSource=admin&retrywrites=true"
  }
  const txtStr = ((txtRecords[0] || [])[0] || "").trim();
  for (const pair of txtStr.split("&").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) params.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  let uri = `mongodb://${credentials}@${hosts}${dbPath}?${params.toString()}`;
  return uri;
}

async function main() {
  const { MongoClient } = require(path.join(__dirname, "..", "node_modules", "mongodb"));
  const uri = await resolveSRV(process.env.MONGODB_URI);
  console.log("[seed] Connecting (SRV resolved via Google DNS)…");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, tls: true });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "hrms");
  const bcrypt = require(path.join(__dirname, "..", "node_modules", "bcryptjs"));

  const withEmail = process.argv.includes("--with-email");
  const summary = [];

  // Welcome email helper (nodemailer via the configured SMTP transport).
  async function sendWelcome(to, name, password) {
    try {
      const nodemailer = require(path.join(__dirname, "..", "node_modules", "nodemailer"));
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "Skora HRMS <info@skorainfotech.com>",
        to,
        subject: "Your Skora HRMS test account",
        html: `<p>Hi ${name},</p><p>Your Skora HRMS test account is ready.</p><p>Email: ${to}<br/>Password: <b>${password}</b></p><p>Please change it after first login.</p>`,
      });
      console.log(`        welcome email sent to ${to}`);
    } catch (e) {
      console.log(`        welcome email failed for ${to}: ${e.message}`);
    }
  }

  for (const email of [...emails].sort()) {
    const role = roleFor(email);
    const password = PASSWORDS[role];
    const users = db.collection("users");
    const existing = await users.findOne({ email });

    const baseDoc = {
      role,
      status: "active",
      loginStatus: "active",
      displayName: email.split("@")[0].replace(/[-.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      tenantId: "default",
      updatedAt: new Date(),
    };

    if (!existing) {
      await users.insertOne({
        email,
        passwordHash: await bcrypt.hash(password, 12),
        ...baseDoc,
        createdAt: new Date(),
      });
      summary.push(`${email}  → CREATED (${role})`);
      if (withEmail) await sendWelcome(email, baseDoc.displayName, password);
    } else {
      // Only sync the fields the suite depends on. Never touch other fields.
      const needsRole = existing.role !== role;
      const passwordOk = await bcrypt.compare(password, existing.passwordHash || existing.password || "");
      const needsStatus = existing.status !== "active";
      if (needsRole || !passwordOk || needsStatus) {
        const set = { ...baseDoc, updatedAt: new Date() };
        if (!passwordOk) set.passwordHash = await bcrypt.hash(password, 12);
        await users.updateOne({ _id: existing._id }, { $set: set });
        summary.push(
          `${email}  → SYNCED (${needsRole ? `role ${existing.role}→${role} ` : ""}${!passwordOk ? "password " : ""}${needsStatus ? "status " : ""})`
        );
      } else {
        summary.push(`${email}  → OK (${role})`);
      }
    }
  }

  console.log("\n[seed] Result:");
  for (const line of summary) console.log("  " + line);
  await client.close();
}

main().catch((e) => {
  console.error("[seed] FAILED:", e.message);
  process.exit(1);
});
