import { redirect } from "next/navigation";

/**
 * Firebase Auth is used instead of NextAuth.
 * Session management is handled via:
 *   GET  /api/auth/session  — get current session
 *   POST /api/auth/session  — create session from ID token
 *   DEL  /api/auth/session  — destroy session
 *
 * This catch-all route redirects to the new session API.
 */
export async function GET() {
  redirect("/api/auth/session");
}

export async function POST() {
  redirect("/api/auth/session");
}

export async function DELETE() {
  redirect("/api/auth/session");
}
