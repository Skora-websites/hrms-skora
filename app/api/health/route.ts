import { NextResponse } from "next/server";
import { getMySQLPool } from "@/lib/db/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getMySQLPool();
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok", db: "up", engine: "mysql" });
  } catch (err: any) {
    return NextResponse.json({ status: "down", db: "down", engine: "mysql", error: err.message }, { status: 503 });
  }
}
