"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import {
  Users,
  Briefcase,
  CalendarCheck,
  FileCheck,
  Plus,
  Clock,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "open" | "paused" | "closed" | "draft";
  applicants: number;
  interviews: number;
  offers: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
  { value: "draft", label: "Draft" },
];

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const statusBadge: Record<string, "success" | "warning" | "danger" | "info"> = {
  open: "success",
  paused: "warning",
  closed: "danger",
  draft: "info",
};

const EMPTY_JOB_FORM = {
  title: "",
  department: "",
  location: "",
  type: "full-time",
  status: "open" as const,
  description: "",
  requirements: "",
};

// ── Component ───────────────────────────────────────────

export default function RecruitmentPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hrm/v2/recruitment?type=jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data || []);
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);
  const mutation = useMutation();
  const toast = useToast();

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [jobForm, setJobForm] = useState(EMPTY_JOB_FORM);

  const resetJobForm = () => setJobForm(EMPTY_JOB_FORM);

  const handleAddJob = async () => {
    if (!jobForm.title.trim() || !jobForm.department.trim()) return;

    const result = await mutation.createRecord("/api/hrm/v2/recruitment", {
      action: "create_job",
      ...jobForm,
      location: jobForm.location || "Remote",
    });

    if (result) {
      setShowAddDialog(false);
      resetJobForm();
      fetchJobs();
      toast.success("Job created", `${jobForm.title} has been posted successfully.`);
    }
  };

  // ── Computed Stats ─────────────────────────────────

  const stats = useMemo(() => ({
    openPositions: jobs.filter((j) => j.status === "open").length,
    totalCandidates: jobs.reduce((sum, j) => sum + j.applicants, 0),
    interviewsScheduled: jobs.reduce((sum, j) => sum + j.interviews, 0),
    offersExtended: jobs.reduce((sum, j) => sum + j.offers, 0),
  }), [jobs]);

  // ── Columns ─────────────────────────────────────────

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Job Title",
        sortable: true,
        cell: (job: any) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <Briefcase className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark dark:text-white truncate">{job.title}</p>
            </div>
          </div>
        ),
      },
      {
        key: "department",
        header: "Department",
        sortable: true,
        cell: (job: any) => <span className="text-sm text-muted">{job.department}</span>,
        hideOnMobile: true,
      },
      {
        key: "location",
        header: "Location",
        cell: (job: any) => <span className="text-sm text-muted">{job.location}</span>,
        hideOnTablet: true,
      },
      {
        key: "type",
        header: "Type",
        cell: (job: any) => (
          <span className="text-xs font-medium text-muted bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {job.type}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (job: any) => (
          <Badge variant={statusBadge[job.status]} size="sm">
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
        ),
      },
      {
        key: "applicants",
        header: "Applicants",
        sortable: true,
        cell: (job: any) => <span className="text-sm font-semibold text-dark dark:text-white">{job.applicants}</span>,
        className: "text-center",
        headerClassName: "text-center",
      },
      {
        key: "interviews",
        header: "Interviews",
        sortable: true,
        cell: (job: any) => <span className="text-sm font-semibold text-dark dark:text-white">{job.interviews}</span>,
        className: "text-center",
        headerClassName: "text-center",
        hideOnTablet: true,
      },
      {
        key: "offers",
        header: "Offers",
        sortable: true,
        cell: (job: any) => <span className="text-sm font-semibold text-dark dark:text-white">{job.offers}</span>,
        className: "text-center",
        headerClassName: "text-center",
        hideOnTablet: true,
      },
      {
        key: "createdAt",
        header: "Posted",
        sortable: true,
        cell: (job: any) => <span className="text-xs text-muted">{job.createdAt}</span>,
        className: "text-right",
        headerClassName: "text-right",
        hideOnMobile: true,
      },
    ],
    []
  );

  // ── Status Filter Element ───────────────────────────

  const statusFilterEl = (
    <div className="relative">
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:shadow-[0_3px_9px_rgba(94,114,228,0.1)] focus:outline-none"
        aria-label="Filter by status"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
    </div>
  );

  // ── Sub-navigation ──────────────────────────────────

  const subNav = (
    <div className="flex items-center gap-2">
      <Link
        href="/hrms/recruitment/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Briefcase className="h-4 w-4" />
        Jobs
      </Link>
      <span className="text-muted">|</span>
      <Link
        href="/hrms/recruitment/candidates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Users className="h-4 w-4" />
        Candidates
      </Link>
      <span className="text-muted">|</span>
      <Link
        href="/hrms/recruitment/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <FileCheck className="h-4 w-4" />
        Applications
      </Link>
    </div>
  );

  const summaryLoading = loading && jobs.length === 0;

  return (
    <AppShell title="Recruitment">
      {/* Toasts */}
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toast
                variant={t.variant}
                message={t.message}
                description={t.description}
                onClose={() => toast.dismissToast(t.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="Recruitment"
        description="Manage job postings, candidates, and hiring workflow."
      >
        <Button onClick={() => { resetJobForm(); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Post a Job
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Open Positions</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.openPositions}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Candidates</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.totalCandidates}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Interviews</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.interviewsScheduled}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Offers Extended</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.offersExtended}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-success" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={jobs}
        searchable
        searchPlaceholder="Search jobs by title or department..."
        searchKeys={["title", "department", "location"]}
        defaultPageSize={10}
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={() => fetchJobs()}
        emptyMessage="No job postings yet"
        filters={<>{statusFilterEl}{subNav}</>}
        showEntriesSelector
        showRecordCount
        skeletonRows={5}
        ariaLabel="Jobs table"
      />

      {/* ── Add Job Dialog ── */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open && !mutation.loading) { setShowAddDialog(false); resetJobForm(); }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Post a New Job</DialogTitle>
                <DialogDescription>
                  Create a new job posting to start accepting applications.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddJob(); }}>
            <div className="space-y-5 px-0.5">
              <FormSection title="Job Details" description="Basic information about the position" icon={<Briefcase className="h-4 w-4" />} columns={2} gradient>
                <FormInput
                  label="Job Title"
                  icon={<Briefcase className="h-4 w-4" />}
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Developer"
                  required
                />
                <FormInput
                  label="Department"
                  icon={<Users className="h-4 w-4" />}
                  value={jobForm.department}
                  onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  required
                />
                <FormInput
                  label="Location"
                  icon={<MapPin className="h-4 w-4" />}
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  placeholder="e.g. Bangalore / Remote"
                />
                <FormSelect
                  label="Employment Type"
                  icon={<Clock className="h-4 w-4" />}
                  value={jobForm.type}
                  onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}
                  options={JOB_TYPE_OPTIONS}
                />
              </FormSection>
              <FormSection title="Description" columns={1}>
                <FormTextarea
                  label="Job Description"
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and ideal candidate..."
                />
              </FormSection>
              <FormSection title="Requirements" columns={1}>
                <FormTextarea
                  label="Requirements"
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                  placeholder="List the key qualifications and skills required..."
                />
              </FormSection>
            </div>
            <FormActions
              onCancel={() => { setShowAddDialog(false); resetJobForm(); }}
              submitLabel={mutation.loading ? "Posting..." : "Post Job"}
              submitIcon={mutation.loading ? undefined : <Plus className="h-4 w-4" />}
              loading={mutation.loading}
              error={mutation.error}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
