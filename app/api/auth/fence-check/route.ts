import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * GET /api/auth/fence-check — internal helper for the Edge middleware.
 *
 * The middleware cannot reach MongoDB from the Edge runtime, so it asks this
 * Node-runtime endpoint whether the CURRENT session still requires the forced
 * password change. This closes the bypass where a user deletes the signed
 * `must_change_password` cookie and keeps using the shared temporary password.
 *
 * Response: { required: boolean, role?: string | null } — never exposes user
 * details beyond the canonical role, which the Edge middleware uses to
 * recover gracefully when the signed `user_role` cookie goes stale after a
 * mid-session role change (see roleStalenessRedirect in middleware.ts).
 * Guard: the endpoint only answers for requests carrying a valid session
 * cookie (verified against the sessions collection), so it cannot be used to
 * probe arbitrary accounts.
 */
export async function GET(request: NextRequest) {
  try {
    const rawSession = request.cookies.get("session")?.value;
    if (!rawSession) {
      return NextResponse.json({ required: false, role: null });
    }

    // Verify the signed cookie value (HMAC) — same scheme as middleware.
    const { verifyCookieValue } = await import("@/lib/edge-cookies");
    const sessionToken = await verifyCookieValue(rawSession);
    if (!sessionToken) {
      return NextResponse.json({ required: false, role: null });
    }

    const db = await getDb();
    if (!db) return NextResponse.json({ required: false, role: null });

    const session = await db.collection("sessions").findOne({
      token: sessionToken,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return NextResponse.json({ required: false, role: null });

    const user = await db.collection("users").findOne(
      { _id: new (await import("mongodb")).ObjectId(session.userId) },
      { projection: { mustChangePassword: 1, role: 1 } }
    );

    return NextResponse.json(
      {
        required: (user as any)?.mustChangePassword === true,
        role: (user as any)?.role ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // Fail open is intentional: an outage must not lock everyone into the
    // fence page. The cookie-based fence remains in place as first line.
    return NextResponse.json({ required: false, role: null });
  }
}
