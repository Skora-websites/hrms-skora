import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const client = await getMongoClient();
    if (!client) return NextResponse.json({ status: "down", db: "down" }, { status: 503 });
    await client.db(process.env.MONGODB_DB || "hrms").command({ ping: 1 });
    return NextResponse.json({ status: "ok", db: "up" });
  } catch {
    return NextResponse.json({ status: "down", db: "down" }, { status: 503 });
  }
}
