import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { updateAttendanceLocation, getLiveEmployeeLocations } from "@/lib/db/attendance";
import { haversineDistance } from "@/lib/geofencing";
import { getOfficeConfig } from "@/lib/hrm/office-config";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const body = await request.json();
    const { latitude, longitude, accuracy } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number" || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    if (accuracy !== undefined && (typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000)) {
      return NextResponse.json({ error: "Invalid GPS accuracy" }, { status: 400 });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const office = await getOfficeConfig();
    const distanceFromOffice = Math.round(haversineDistance(latitude, longitude, office.latitude, office.longitude));
    const updated = await updateAttendanceLocation(
      auth.userId,
      dateStr,
      latitude,
      longitude,
      typeof accuracy === "number" ? accuracy : 0,
      distanceFromOffice,
      auth.tenantId
    );

    if (!updated) return NextResponse.json({ error: "No active attendance record found. Please punch in first." }, { status: 404 });
    return NextResponse.json({ success: true, distanceFromOffice, workLocation: distanceFromOffice <= office.geofenceRadius ? "office" : "remote" });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/attendance/location error:", error);
    return NextResponse.json({ error: "Unable to update attendance location" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    if (auth.role === "employee") return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });

    const locations = await getLiveEmployeeLocations(auth.tenantId);
    if (auth.role !== "manager") return NextResponse.json({ data: locations });

    // Managers may only see live locations for users in their own department.
    const db = await getDb();
    if (!db) return NextResponse.json({ data: [] });
    const manager = await db.collection("users").findOne({ _id: new ObjectId(auth.userId), tenantId: auth.tenantId });
    const department = manager?.department || manager?.departmentName;
    if (!department) return NextResponse.json({ data: [] });

    const teamUsers = await db.collection("users").find({
      tenantId: auth.tenantId,
      status: { $nin: ["inactive", "disabled"] },
      $or: [{ department }, { departmentName: department }],
    }).project({ _id: 1 }).toArray();
    const teamIds = new Set(teamUsers.map((u: any) => u._id.toString()));
    return NextResponse.json({ data: locations.filter((location) => teamIds.has(location.userId)) });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/attendance/location error:", error);
    return NextResponse.json({ error: "Unable to load live attendance locations" }, { status: 500 });
  }
}
