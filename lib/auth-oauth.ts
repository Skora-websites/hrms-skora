"use client";

/**
 * OAuth authentication helpers (MongoDB native session flow).
 */

export async function signInWithGoogle(): Promise<{ success: boolean }> {
  throw new Error("Google OAuth is disabled. Please sign in using your company email and password.");
}

export async function signInWithGoogleRedirect(): Promise<void> {
  throw new Error("Google OAuth is disabled. Please sign in using your company email and password.");
}

export async function handleRedirectResult(): Promise<{ success: boolean } | null> {
  return null;
}

export async function signInWithGitHub(): Promise<{ success: boolean }> {
  throw new Error("GitHub OAuth is disabled. Please sign in using your company email and password.");
}
