"use client";

import { useState } from "react";
import {
  ShieldAlert,
  UserCheck,
  Clock,
  AlertTriangle,
  Users,
  Search,
  ChevronRight,
  CheckCircle2,
  Edit,
  UserX,
  Building,
} from "lucide-react";

export interface UnassignedEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  role: string;
}

export interface OnboardingEscalation {
  id: string;
  candidateName: string;
  email: string;
  department: string;
  taskName: string;
  overdueHours: number;
  status: string;
  createdAt: string;
}

export interface AvailableManager {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface DirectoryUser {
  id: string;
  displayName?: string;
  email: string;
  department: string;
  designation: string;
  role: string;
  status: string;
  reportingManager: string;
  createdAt?: string;
}

interface CeoGovernanceConsoleProps {
  unassigned: UnassignedEmployee[];
  escalations: OnboardingEscalation[];
  availableManagers: AvailableManager[];
  directory: DirectoryUser[];
  onAssignManager: (employeeId: string, managerId: string) => Promise<void>;
  onEditUser: (user: DirectoryUser) => void;
}

export function CeoGovernanceConsole({
  unassigned,
  escalations,
  availableManagers,
  directory,
  onAssignManager,
  onEditUser,
}: CeoGovernanceConsoleProps) {
  const [activeTab, setActiveTab] = useState<"unassigned" | "escalations" | "directory">("unassigned");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedMgrByEmp, setSelectedMgrByEmp] = useState<Record<string, string>>({});
  const [directorySearch, setDirectorySearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleManagerSelect = (empId: string, mgrId: string) => {
    setSelectedMgrByEmp((prev) => ({ ...prev, [empId]: mgrId }));
  };

  const handleExecuteAssign = async (empId: string) => {
    const mgrId = selectedMgrByEmp[empId];
    if (!mgrId) return;
    setAssigningId(empId);
    try {
      await onAssignManager(empId, mgrId);
    } finally {
      setAssigningId(null);
    }
  };

  const filteredDirectory = directory
    .filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!directorySearch.trim()) return true;
      const q = directorySearch.toLowerCase();
      return (
        (u.displayName || "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q) ||
        u.designation.toLowerCase().includes(q)
      );
    });

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                CEO Governance & Escalation Console
              </h2>
              {unassigned.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {unassigned.length} Action Needed
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strictly CEO-controlled reporting manager assignments, 48h onboarding deadlines & access control
            </p>
          </div>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("unassigned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "unassigned"
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Missing Managers ({unassigned.length})
          </button>
          <button
            onClick={() => setActiveTab("escalations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "escalations"
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            48h Escalations ({escalations.length})
          </button>
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "directory"
                ? "bg-card text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Directory ({directory.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Unassigned Managers Queue */}
      {activeTab === "unassigned" && (
        <div className="space-y-3">
          {unassigned.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border bg-emerald-500/5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">Hierarchy Intact</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All active employees are successfully assigned to reporting managers.
              </p>
            </div>
          ) : (
            unassigned.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{emp.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                      Missing Manager
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {emp.email} &bull; {emp.department} &bull; {emp.designation}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedMgrByEmp[emp.id] || ""}
                    onChange={(e) => handleManagerSelect(emp.id, e.target.value)}
                    className="h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Manager...</option>
                    {availableManagers.map((mgr) => (
                      <option key={mgr.id} value={mgr.name}>
                        {mgr.name} ({mgr.department})
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!selectedMgrByEmp[emp.id] || assigningId === emp.id}
                    onClick={() => handleExecuteAssign(emp.id)}
                    className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    {assigningId === emp.id ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: 48h Candidate Onboarding Escalations */}
      {activeTab === "escalations" && (
        <div className="space-y-3">
          {escalations.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border bg-emerald-500/5">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">Zero Escalations</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                All candidate onboarding verifications are within the 48-hour SLA deadline.
              </p>
            </div>
          ) : (
            escalations.map((esc) => (
              <div
                key={esc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{esc.candidateName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/30">
                      +{esc.overdueHours}h Overdue
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {esc.email} &bull; {esc.department} &bull; Task: {esc.taskName}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/hrms/hr-admin?view=onboarding`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                  >
                    View in HR Desk
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Directory & Access Control */}
      {activeTab === "directory" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by name, email, department..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="manager">Manager</option>
              <option value="hr_admin">HR Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {filteredDirectory.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">
                      {user.displayName || user.email}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${
                        user.role === "manager"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          : user.role === "hr_admin"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.status !== "active" && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium">
                        {user.status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {user.email} &bull; {user.department} &bull; Rep. Mgr:{" "}
                    <span className="font-medium text-foreground">
                      {user.role === "manager" ? "N/A (Manager)" : user.reportingManager || "Unassigned"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onEditUser(user)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
