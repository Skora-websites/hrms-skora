"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  Search,
  Plus,
  MapPin,
  Clock,
  Users,
  CalendarCheck,
  FileCheck,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Mock Data ───────────────────────────────────────────

const MOCK_JOBS: any[] = [];

const statusBadge: Record<string, "success" | "warning" | "danger" | "info"> = {
  open: "success",
  paused: "warning",
  closed: "danger",
  draft: "info",
};

export default function JobsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = MOCK_JOBS.filter((j) => {
    const q = search.toLowerCase();
    return !search || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Jobs">
      <PageHeader title="Jobs" description="Manage all job postings and track applicants per role.">          <Button onClick={() => router.push("/recruitment")}>
          <Plus className="mr-2 h-4 w-4" />
          Post a Job
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search jobs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No jobs found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-dark dark:text-white">{job.title}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />{job.department}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{job.location}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />{job.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusBadge[job.status]} size="sm">
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </Badge>
                  <span className="text-xs font-semibold text-dark dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {job.applicants} applicants
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
