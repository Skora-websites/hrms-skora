import { NextRequest, NextResponse } from "next/server";
import { createSession, signInWithMongo, SESSION_COOKIE_OPTIONS, SESSION_EXPIRES_IN_MS } from "@/lib/auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";
import { HRMS_ACCOUNT_ROLES } from "@/lib/constants";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return badRequest("Email and password are required");
  }

  // Authenticate against MongoDB — catch auth errors and return 401
  let user;
  try {
    user = await signInWithMongo(email, password);
  } catch (authError: any) {
    const msg = authError?.message || "Invalid credentials";
    return NextResponse.json(
      { error: msg },
      { status: 401 }
    );
  }

  // Create session in MongoDB
  const sessionToken = await createSession(user.id);

  // ── Role-by-email: the authoritative HRMS_ACCOUNT_ROLES map decides the role. ──
  // Self-heal the stored record so API-level permission checks agree with the
  // cookie-driven dashboard routing, then set the cookie from the mapped role.
  const normalizedEmail = email.toLowerCase().trim();
  const mappedAccount = HRMS_ACCOUNT_ROLES[normalizedEmail];
  let effectiveRole = user.role;
  if (mappedAccount && mappedAccount.role !== user.role) {
    effectiveRole = mappedAccount.role;
    try {
      const { getDb } = await import("@/lib/db/mongo-helper");
      const db = await getDb();
      if (db) {
        await db
          .collection("users")
          .updateOne(
            { email: normalizedEmail },
            { $set: { role: effectiveRole, updatedAt: new Date() } }
          );
      }
    } catch {
      // Self-heal is best-effort; the cookie below still routes by the mapped role.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("session", sessionToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });

  response.cookies.set("user_role", effectiveRole, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });

  // Check if user must change password on first login
  const mustChange = (user as any).mustChangePassword === true;
  if (mustChange) {
    response.cookies.set("must_change_password", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
    });
  }

  return response;
}, { label: "Login" });
