import { NextResponse } from "next/server";
import { getMySQLPool } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbLatencyMs = -1;

  try {
    const pool = getMySQLPool();
    const [rows] = await pool.query("SELECT 1 AS alive");
    if (Array.isArray(rows) && rows.length > 0) {
      dbStatus = "connected";
      dbLatencyMs = Date.now() - startTime;
    } else {
      dbStatus = "unexpected_response";
    }
  } catch (err: any) {
    dbStatus = `error: ${err.message || String(err)}`;
    return NextResponse.json(
      {
        status: "degraded",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
        },
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "hrms-skora",
      environment: process.env.NODE_ENV || "production",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
    { status: 200 }
  );
}
