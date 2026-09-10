import "server-only";
import { createMongoService } from "@/lib/hrm/mongo";
import type { Job, Candidate, Application, Interview, Offer } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Recruitment Module Service — MongoDB backed
// ══════════════════════════════════════════════════════════════════

const jobsService = createMongoService<Job>("jobs");
const candidatesService = createMongoService<Candidate>("candidates");
const applicationsService = createMongoService<Application>("applications");

// ── Jobs ───────────────────────────────────────────────

export async function getJobs(tenantId: string): Promise<Job[]> {
  return jobsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getJobById(id: string): Promise<Job | null> {
  return jobsService.findById(id);
}

export async function createJob(tenantId: string, data: Partial<Job>): Promise<Job> {
  return jobsService.create({
    ...data,
    tenantId,
    title: data.title || "",
    department: data.department || "",
    location: data.location || "",
    type: data.type || "full-time",
    status: data.status || "draft",
    description: data.description || "",
    requirements: data.requirements || "",
    applicants: 0,
    interviews: 0,
    offers: 0,
  } as any);
}

export async function updateJob(id: string, data: Partial<Job>): Promise<Job | null> {
  return jobsService.update(id, data as any);
}

export async function deleteJob(id: string): Promise<boolean> {
  return jobsService.delete(id);
}

export async function getJobsDashboard(tenantId: string): Promise<{
  totalJobs: number;
  openPositions: number;
  totalCandidates: number;
  interviewsScheduled: number;
  offersExtended: number;
}> {
  const jobs = await getJobs(tenantId);
  const candidates = await candidatesService.findManyInTenant(tenantId);

  return {
    totalJobs: jobs.length,
    openPositions: jobs.filter((j) => j.status === "open").length,
    totalCandidates: candidates.length,
    interviewsScheduled: jobs.reduce((sum, j) => sum + (j.interviews || 0), 0),
    offersExtended: jobs.reduce((sum, j) => sum + (j.offers || 0), 0),
  };
}

// ── Candidates ─────────────────────────────────────────

export async function getCandidates(tenantId: string): Promise<Candidate[]> {
  return candidatesService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createCandidate(tenantId: string, data: Partial<Candidate>): Promise<Candidate> {
  const candidate = await candidatesService.create({
    ...data,
    tenantId,
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    position: data.position || "",
    jobId: data.jobId || "",
    location: data.location || "",
    status: "new",
  } as any);

  // Update job applicant count
  if (data.jobId) {
    const job = await jobsService.findById(data.jobId);
    if (job) {
      await jobsService.update(data.jobId, {
        applicants: (job.applicants || 0) + 1,
      } as any);
    }
  }

  return candidate;
}

// ── Applications ───────────────────────────────────────

export async function getApplications(tenantId: string): Promise<Application[]> {
  return applicationsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}
