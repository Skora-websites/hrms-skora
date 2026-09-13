import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./db/mongo-helper";
import { ApiError } from "./api-handler";
import { normalizeRoleStrict } from "./role-utils";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import bcrypt from "bcryptjs";

async function getDbWithTimeout(): Promise<Awaited<ReturnType<typeof getDb>>> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 9000));
  const dbPromise = getDb();
  return Promise.race([dbPromise, timeout]);
}

export interface Session {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
    department?: string | null;
    /** Canonical account status: e.g. pending_verification, active, disabled. */
    status?: string | null;
    /** Official HR-issued employee code, if one has been assigned. */
    employeeCode?: string | null;
    /** Coarse onboarding state: pending -> approved/rejected. */
    onboardingStatus?: string | null;
    /** Self-service profile fields (employee profile page). */
    phone?: string | null;
    emergencyContact?: string | null;
    bankAccount?: string | null;
  } | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function auth(): Promise<Session> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (!sessionToken) return { user: null };

  try {
    const db = await getDbWithTimeout();
    if (!db) return { user: null };
    const session = await db.collection("sessions").findOne({
      token: sessionToken,
      expiresAt: { $gt: new Date() },
    });
    if (!session) return { user: null };

    const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
    if (!user) return { user: null };

    const role = normalizeRoleStrict(user.role);
    return {
      user: {
        id: user._id.toString(),
        name: user.displayName || user.firstName || null,
        email: user.email || null,
        image: user.image || null,
        role,
        department: user.department || user.departmentName || null,
        status: user.status || null,
        employeeCode: user.employeeCode || null,
        onboardingStatus: user.onboardingStatus || null,
        phone: user.phone || null,
        emergencyContact: user.emergencyContact || null,
        bankAccount: user.bankAccount || null,
      },
    };
  } catch {
    return { user: null };
  }
}

export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new ApiError("Login is temporarily unavailable. Please try again shortly.", 503);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN_MS);
  await db.collection("sessions").insertOne({ token, userId, expiresAt, createdAt: new Date() });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  if (sessionToken) {
    try {
      const db = await getDb();
      if (db) await db.collection("sessions").deleteOne({ token: sessionToken });
    } catch { /* ignore */ }
  }
  cookieStore.delete("session");
}

export async function signInWithMongo(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: string; displayName: string; mustChangePassword: boolean }> {
  const db = await getDbWithTimeout();
  if (!db) throw new ApiError("Login is temporarily unavailable. Please try again shortly.", 503);
  const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
  if (!user) throw new Error("Invalid email or password");
  const passwordHash = user.passwordHash || user.password;
  if (!passwordHash) throw new Error("Invalid email or password");
  const valid = await verifyPassword(password, passwordHash);
  if (!valid) throw new Error("Invalid email or password");
  if (user.status === "disabled" || user.status === "inactive" || user.loginStatus === "disabled") {
    throw new Error("This account has been disabled");
  }
  return {
    id: user._id.toString(),
    email: user.email,
    role: normalizeRoleStrict(user.role),
    displayName: user.displayName || user.firstName || email,
    mustChangePassword: (user as any).mustChangePassword === true,
  };
}

export async function setAdminSessionCookie(token: string = "authenticated"): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}

export async function isSubmittedAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return Boolean(cookieStore.get("admin_session")?.value);
}
