"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z, type ZodError } from "zod";
import bcrypt from "bcryptjs";
import { hrmUsersService } from "@/lib/hrm/firestore";
import {
  signInWithMongo,
  createSession,
  destroySession,
  SESSION_COOKIE_OPTIONS,
  SESSION_EXPIRES_IN_MS,
} from "@/lib/auth";
import { normalizeRole } from "@/lib/rbac";

function formatZodErrors<T>(error: ZodError<T>): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: z.string().email("Please enter a valid email").trim(),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/[a-zA-Z]/, "Password must contain at least one letter").regex(/[0-9]/, "Password must contain at least one number"),
});

const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email").trim(),
  password: z.string().min(1, "Password is required"),
});

export type AuthState = {
  errors?: { name?: string[]; email?: string[]; password?: string[]; _form?: string[]; };
  success?: boolean;
  message?: string;
};

const ROLE_DASHBOARDS: Record<string, string> = {
  super_admin: "/hrms/superadmin",
  hr_admin: "/hrms/hr-admin",
  admin: "/hrms/hr-admin",
  manager: "/hrms/manager",
  employee: "/hrms/employee",
};

export async function signup(prevState: AuthState | undefined, formData: FormData): Promise<AuthState | undefined> {
  const validated = SignupSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!validated.success) return { errors: formatZodErrors(validated.error), message: "Please fix the errors above." };
  const { name, email, password } = validated.data;
  try {
    // Check if user already exists
    const existing = await hrmUsersService.findOne("email", email.toLowerCase());
    if (existing) {
      return { errors: { email: ["An account with this email already exists"] }, message: "Registration failed." };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // First user is super_admin, rest are employees
    const existingCount = await hrmUsersService.count();
    const role = existingCount === 0 ? "super_admin" : "employee";

    // Create user in MongoDB
    const newUser = await hrmUsersService.create({
      email,
      displayName: name,
      firstName: name,
      role,
      status: "active",
      passwordHash,
      tenantId: "default",
    } as any);

    // Create session
    const sessionToken = await createSession(newUser.id);
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_EXPIRES_IN_MS / 1000 });
    cookieStore.set("user_role", role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_EXPIRES_IN_MS / 1000 });
    redirect(ROLE_DASHBOARDS[role] || "/hrms/employee");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("Signup error:", error);
    return { errors: { _form: [error instanceof Error ? error.message : "Registration failed."] }, message: "Registration failed." };
  }
}

export async function login(prevState: AuthState | undefined, formData: FormData): Promise<AuthState | undefined> {
  const validated = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!validated.success) return { errors: formatZodErrors(validated.error), message: "Please fix the errors above." };
  const { email, password } = validated.data;
  try {
    const user = await signInWithMongo(email, password);
    const sessionToken = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_EXPIRES_IN_MS / 1000 });
    cookieStore.set("user_role", user.role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_EXPIRES_IN_MS / 1000 });
    redirect(ROLE_DASHBOARDS[user.role] || "/hrms/employee");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("Login error:", error);
    return { errors: { _form: [error instanceof Error ? error.message : "Invalid email or password."] }, message: "Login failed." };
  }
}

export async function logout() {
  await destroySession();
  const cookieStore = await cookies();
  cookieStore.delete("user_role");
  redirect("/hrms/login");
}

export async function signInWithProvider(_provider: "google" | "github") {
  throw new Error("Use client-side OAuth flow instead.");
}

export async function createSessionFromIdToken(_idToken: string): Promise<void> {
  // No longer needed — sessions are created via MongoDB
}
