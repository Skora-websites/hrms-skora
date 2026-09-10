import { NextRequest, NextResponse } from "next/server";
import { createSession, destroySession, auth, SESSION_COOKIE_OPTIONS, SESSION_EXPIRES_IN_MS } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session.user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json(session);
}

export async function POST(request: NextRequest) {
  // Only allow session creation from the login flow or authenticated admin actions.
  // This endpoint is now restricted to prevent session fixation attacks.
  // The login flow uses /api/auth/login which handles session + cookie creation.
  return NextResponse.json(
    { error: "This endpoint is disabled. Use /api/auth/login instead." },
    { status: 403 }
  );
}

export async function DELETE() {
  await destroySession();
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  response.cookies.delete("user_role");
  return response;
}
