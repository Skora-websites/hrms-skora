"use server";

import { getDb } from "@/lib/db/mongo-helper";
import bcrypt from "bcryptjs";
import { setAdminSessionCookie } from "@/lib/auth";

/**
 * Admin login — authenticates against the same hrms.users collection
 * that the HRMS portal uses. Looks for users with role 'super_admin' or 'hr_admin'.
 * Uses bcrypt password verification (same as HRMS login).
 */
export async function loginAdminAction(usernameInput: string, passwordInput: string) {
  try {
    const username = String(usernameInput || "").trim();
    const password = String(passwordInput || "").trim();

    if (!username || !password) {
      return { success: false, error: "Username and password are required." };
    }

    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available. Please try again." };
    }

    // Look up user by email — don't filter by tenantId since HRMS login doesn't either
    const user = await db.collection("users").findOne({
      email: username.toLowerCase(),
    });

    if (!user) {
      console.warn(`[Admin Auth] Login failed — no user found for '${username}'`);
      console.warn(`[Admin Auth] All users in DB:`, await db.collection("users").countDocuments(), "total");
      return { success: false, error: "Invalid credentials. No account found with this email." };
    }

    // Only allow super_admin or hr_admin to access admin portal
    const role = (user.role || "").toLowerCase();
    if (role !== "super_admin" && role !== "hr_admin") {
      console.warn(`[Admin Auth] Login failed — user '${username}' has role '${role}', not admin`);
      return { success: false, error: `Access denied. Your role is '${role}'. Only super_admin and hr_admin can access the admin portal.` };
    }

    // Check if account is active
    if (user.loginStatus === "disabled") {
      return { success: false, error: "Account is disabled. Contact administrator." };
    }

    // Verify password with bcrypt (same as HRMS portal)
    const passwordHash = user.passwordHash;
    if (!passwordHash) {
      console.warn(`[Admin Auth] Login failed — user '${username}' has no password hash. Has fields:`, Object.keys(user).join(", "));
      return { success: false, error: "Invalid credentials. Account has no password set." };
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      console.warn(`[Admin Auth] Login failed — wrong password for '${username}'`);
      return { success: false, error: "Invalid credentials." };
    }

    console.log(`[Admin Auth] Login succeeded for '${username}' (role: ${role})`);
    await setAdminSessionCookie();
    return { success: true };
  } catch (error) {
    console.error("Admin login error:", error);
    return { success: false, error: "Authentication failed. Please check database connection." };
  }
}
