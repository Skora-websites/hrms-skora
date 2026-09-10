import { NextResponse } from "next/server";

/**
 * Database seeding is intentionally disabled over HTTP.
 *
 * A previous implementation could delete users/sessions and return a shared
 * temporary password. Production database changes must be performed by the
 * explicit, non-destructive migration in scripts/migrate-current-team.js.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Database seeding is disabled over HTTP.",
      message: "Use scripts/migrate-current-team.js for the current team synchronization.",
    },
    { status: 410 },
  );
}
