import { NextRequest, NextResponse } from "next/server";
import { requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { getDb } from "@/lib/db/mongo-helper";
import { isSensitiveField, revealToken } from "@/lib/pii-masking";
import { recordAuditLog } from "@/services/hrm/audit";
import { ObjectId } from "mongodb";

/**
 * POST /api/hrm/v2/onboarding/reveal
 * HR-level only. Reveals ONE sensitive field (Aadhar / PAN / bank account /
 * nominee Aadhar) of ONE onboarding request per call.
 *
 * Body: { taskId, field, token } — the token is the HMAC issued alongside the
 * masked payload; it binds the reveal to (taskId, field, current value) so a
 * leaked token cannot reveal anything else and cannot be replayed after the
 * request row changes.
 *
 * Every successful reveal is written to the audit log with the caller's
 * identity, the target request, and which field was revealed.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireHrLevel();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json().catch(() => null);
  const taskId = body?.taskId;
  const field = body?.field;
  const token = body?.token;

  if (!taskId || typeof taskId !== "string") return badRequest("taskId is required");
  if (!field || typeof field !== "string" || !isSensitiveField(field)) {
    return badRequest("field must be one of: aadharNo, nomineeAadhar, panNo, bankAccountNumber");
  }
  if (!token || typeof token !== "string") return badRequest("token is required");

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

  const taskFilter = ObjectId.isValid(taskId) ? { _id: new ObjectId(taskId) } : { id: taskId };
  const task = await db.collection("employee_onboarding_tasks").findOne(taskFilter).catch(() => null);
  if (!task) return notFound("Onboarding request not found");

  // Managers can never reveal — requireHrLevel already gates, but the row's
  // department scoping is deliberately not enforced here: HR/CEO may review
  // any request. The token check below is the anti-forgery control.
  const details = (task.onboardingDetails || {}) as Record<string, unknown>;
  const value = details[field];
  if (typeof value !== "string" || !value) return notFound(`No ${field} stored on this request`);

  const expected = revealToken(String(task._id), field, value);
  if (token !== expected) return forbidden("Invalid or expired reveal token");

  // Actor identity for the audit trail (ApiAuthResult carries only ids).
  let actorName = auth.userId;
  const actor = await db.collection("users").findOne(
    { _id: new ObjectId(auth.userId) },
    { projection: { displayName: 1, email: 1 } }
  ).catch(() => null);
  if (actor) {
    actorName = actor.displayName || actor.email || actorName;
  }

  await recordAuditLog({
    tenantId: "default",
    action: "update_user",
    performedById: auth.userId,
    performedByName: actorName,
    targetUserId: String(task.userId || task.email || task._id),
    targetUserEmail: String(task.email || ""),
    details: `Revealed ${field} on onboarding request ${task.email || String(task._id)}`,
    metadata: { field, taskId: String(task._id), kind: "pii_reveal" },
  }).catch(() => undefined);

  return NextResponse.json({ data: { field, value } });
}, { label: "OnboardingReveal" });
