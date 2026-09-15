#!/usr/bin/env node
/**
 * Prints a direct (non-SRV) mongodb:// URI equivalent to the mongodb+srv:// URI
 * in .env.local / MONGODB_URI, by resolving SRV + TXT records via nslookup.exe.
 *
 * Reason: on some Windows machines Node's dns module cannot reach any DNS
 * server directly (ECONNREFUSED) while nslookup.exe works, so the MongoDB
 * driver (and lib/mongodb.ts resolveSRV) fail. The printed URI must be kept
 * SECRET — pipe it into an env var, never log it.
 *
 * Usage:  export MONGODB_URI="$(node scripts/direct-mongo-uri.js)" && npm test
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let uri = process.env.MONGODB_URI || "";
if (!uri) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*MONGODB_URI\s*=\s*(.*)\s*$/);
      if (m) { uri = m[1].replace(/^["']|["']$/g, ""); break; }
    }
  }
}
if (!uri || !uri.startsWith("mongodb+srv://")) {
  console.error("No mongodb+srv URI found");
  process.exit(1);
}

function nslookup(type, name) {
  const out = execSync(`nslookup -type=${type} ${name} 8.8.8.8`, { encoding: "utf8", timeout: 20000 });
  return out;
}

// ── Parse the SRV URI ──────────────────────────────────────
const body = uri.replace("mongodb+srv://", "");
const at = body.indexOf("@");
const credentials = at >= 0 ? body.substring(0, at) : "";
const afterAt = at >= 0 ? body.substring(at + 1) : body;
const slash = afterAt.indexOf("/");
const host = slash >= 0 ? afterAt.substring(0, slash) : afterAt;
const rest = slash >= 0 ? afterAt.substring(slash) : "/";
const qIndex = rest.indexOf("?");
const dbPath = qIndex >= 0 ? rest.substring(0, qIndex) : rest;
const existingQuery = qIndex >= 0 ? rest.substring(qIndex + 1) : "";

// ── SRV records ────────────────────────────────────────────
const srvOut = nslookup("SRV", `_mongodb._tcp.${host}`);
const hosts = [];
for (const m of srvOut.matchAll(/svr hostname\s*=\s*([a-z0-9.-]+)\s*$/gim)) hosts.push(m[1]);
const ports = [...srvOut.matchAll(/port\s*=\s*(\d+)/gi)].map((m) => m[1]);
if (hosts.length === 0) { console.error("SRV resolution failed"); process.exit(1); }
const hostList = hosts.map((h, i) => `${h}:${ports[i] || 27017}`).join(",");

// ── TXT params (replicaSet / authSource / ssl) ─────────────
let txtParams = "";
try {
  const txtOut = nslookup("TXT", host);
  const t = txtOut.match(/text\s*=\s*['"]?([^'"\r\n]+)/i);
  if (t) txtParams = t[1].trim();
} catch { /* no TXT — fine */ }

const merged = new Map();
if (txtParams) txtParams.split("&").forEach((p) => { const eq = p.indexOf("="); if (eq > 0) merged.set(p.substring(0, eq), p.substring(eq + 1)); });
existingQuery.split("&").forEach((p) => { if (!p) return; const eq = p.indexOf("="); if (eq > 0) merged.set(p.substring(0, eq), p.substring(eq + 1)); else merged.set(p, ""); });

const query = [...merged.entries()].map(([k, v]) => `${k}=${v}`).join("&");
const direct = `mongodb://${credentials}@${hostList}${dbPath}${query ? "?" + query : ""}`;
process.stdout.write(direct);
