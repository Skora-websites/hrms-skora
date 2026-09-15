"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Mail,
  Phone,
  MapPin,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Types ───────────────────────────────────────────────

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  location?: string;
  status: "new" | "review" | "shortlisted" | "interviewing" | "offered" | "hired" | "rejected";
  appliedDate?: string;
  createdAt?: string;
}

const statusBadge: Record<string, "success" | "warning" | "info" | "primary" | "danger"> = {
  new: "info",
  review: "warning",
  shortlisted: "primary",
  interviewing: "warning",
  offered: "success",
  hired: "success",
  rejected: "danger",
};

export default function CandidatesPage() {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/recruitment?type=candidates");
      const data = res.ok ? await res.json() : { data: [] };
      setCandidates(data.data || []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return !search || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.position.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Candidates">
      <PageHeader title="Candidates" description="View and manage all job applicants across positions." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search candidates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted">Loading candidates...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No candidates found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((candidate, idx) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-dark dark:text-white">{candidate.name}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Mail className="h-3 w-3" />{candidate.email}
                      </span>
                      {candidate.phone && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Phone className="h-3 w-3" />{candidate.phone}
                        </span>
                      )}
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />{candidate.position || "Unassigned"}
                      </span>
                      {candidate.location && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{candidate.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={statusBadge[candidate.status] || "info"} size="sm">
                    {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                  </Badge>
                  {candidate.appliedDate && (
                    <span className="text-xs text-muted">Applied {candidate.appliedDate}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
