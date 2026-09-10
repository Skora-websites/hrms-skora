import { NextRequest, NextResponse } from "next/server";
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobsDashboard,
  getCandidates,
  createCandidate,
  getApplications,
} from "@/services/hrm/recruitment";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound } from "@/lib/api-handler";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const dashboard = searchParams.get("dashboard") === "true";

  // Dashboard stats
  if (dashboard) {
    const stats = await getJobsDashboard(tenantId);
    return NextResponse.json({ data: stats });
  }

  // Jobs
  if (type === "jobs" || !type) {
    if (id) {
      const job = await getJobById(id);
      if (!job) return notFound("Job not found");
      return NextResponse.json({ data: job });
    }
    const jobs = await getJobs(tenantId);
    return NextResponse.json({ data: jobs });
  }

  // Candidates
  if (type === "candidates") {
    const candidates = await getCandidates(tenantId);
    return NextResponse.json({ data: candidates });
  }

  // Applications
  if (type === "applications") {
    const applications = await getApplications(tenantId);
    return NextResponse.json({ data: applications });
  }

  return badRequest("Invalid type. Use: jobs, candidates, applications");
}, { label: "Recruitment" });

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  const action = body.action || "create_job";

  // Create job
  if (action === "create_job") {
    if (!body.title || !body.department) {
      return badRequest("Missing required fields: title, department");
    }
    const job = await createJob(tenantId, {
      ...body,
      createdById: auth.userId,
    });
    return NextResponse.json({ data: job }, { status: 201 });
  }

  // Create candidate
  if (action === "create_candidate") {
    if (!body.name || !body.email) {
      return badRequest("Missing required fields: name, email");
    }
    const candidate = await createCandidate(tenantId, {
      ...body,
      position: body.position || "",
    });
    return NextResponse.json({ data: candidate }, { status: 201 });
  }

  return badRequest("Invalid action. Use: create_job, create_candidate");
}, { label: "Recruitment" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("id parameter required");

  const body = await request.json();
  const job = await updateJob(id, body);
  if (!job) return notFound("Job not found");
  return NextResponse.json({ data: job });
}, { label: "Recruitment" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("id parameter required");
  const deleted = await deleteJob(id);
  if (!deleted) return notFound("Job not found");
  return NextResponse.json({ success: true });
}, { label: "Recruitment" });
