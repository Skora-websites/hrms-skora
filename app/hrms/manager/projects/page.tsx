"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, Search, Loader2, X, CheckCircle2, Users } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Project {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  budget?: number;
  progress?: number;
  ownerId?: string;
  startDate?: string;
  endDate?: string;
}

interface UserOption {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  departmentName?: string;
}

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  in_progress: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  on_hold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function ManagerProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);
  const [search, setSearch] = useState("");

  // Team picker (department employees) + selected assignees
  const [team, setTeam] = useState<UserOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const flash = (message: string, isError = false) => {
    setMsg(message);
    setMsgError(isError);
    setTimeout(() => setMsg(null), 3500);
  };

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/projects");
      if (res.ok) {
        const d = await res.json();
        setProjects(Array.isArray(d.data) ? d.data : []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/hrm/v2/users?action=list");
      if (res.ok) {
        const d = await res.json();
        const all = (Array.isArray(d.data) ? d.data : []) as any[];
        const dept = (user?.department || "").toLowerCase();
        setTeam(
          all
            .filter((u) => {
              const r = (u.role || "").toLowerCase();
              if (r !== "employee" && r !== "agent") return false;
              if (dept) {
                const ud = (u.department || u.departmentName || "").toLowerCase();
                return ud === dept;
              }
              return true;
            })
            .map((u) => ({ id: u._id || u.id, displayName: u.displayName || u.name, email: u.email, department: u.department || u.departmentName }))
        );
      }
    } catch {}
  }, [user?.department]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (showCreate) loadTeam();
  }, [showCreate, loadTeam]);

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // 1. Create the project — server notifies department employees.
      const res = await fetch("/api/hrm/v2/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim(),
          priority,
          status: "planning",
          ownerId: user?.id,
          department: user?.department || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(err.error || "Failed to create project", true);
        setSaving(false);
        return;
      }
      const created = (await res.json())?.data;
      const projectId = created?.id || created?._id;

      // 2. Add selected teammates as members (each gets a notification).
      for (const memberUserId of selectedMembers) {
        await fetch("/api/hrm/v2/projects?action=member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, userId: memberUserId, role: "member" }),
        });
      }

      flash(selectedMembers.length > 0 ? `Project created — ${selectedMembers.length} teammate(s) added & notified` : "Project created — department notified");
      setShowCreate(false);
      setName("");
      setDesc("");
      setPriority("medium");
      setSelectedMembers([]);
      loadProjects();
    } catch {
      flash("Network error", true);
    }
    setSaving(false);
  };

  const filtered = projects.filter(
    (p) => !search || (p.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = projects.filter((p) => p.status === "active" || p.status === "in_progress").length;
  const myProjects = projects.filter((p) => p.ownerId === user?.id);

  return (
    <AppShell title="Projects & Tasks">
      {msg && (
        <div
          className={
            "fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg " +
            (msgError
              ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400")
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          {msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Projects & Tasks</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {projects.length} total &middot; {activeCount} active &middot; {myProjects.length} owned by you
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-white gap-2 font-bold text-xs">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">New Project</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
            <textarea
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="critical">Critical</option>
            </select>

            {/* Team picker */}
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Add teammates ({team.length} available
                {user?.department ? ` in ${user.department}` : ""})
              </p>
              {team.length === 0 ? (
                <p className="text-[11px] text-slate-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-3">
                  No employees found{user?.department ? " in your department" : ""}. They will still be notified about
                  the new project.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-gray-200 dark:border-white/10 p-2">
                  {team.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(t.id)}
                        onChange={() => toggleMember(t.id)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="text-slate-900 dark:text-white font-medium">{t.displayName || t.email}</span>
                      {t.department && <span className="text-slate-400 text-[10px]">{t.department}</span>}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5">
                Everyone in your department gets a notification when the project is created.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !name.trim()} className="bg-primary text-white font-bold text-xs">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create & Notify"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold">No projects yet</p>
            <p className="mt-1 text-[11px]">
              Projects created by leadership appear here automatically — or create one for your department.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => {
              const pid = p.id || p._id || "";
              return (
                <div
                  key={pid}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-4 space-y-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</h3>
                    <span
                      className={
                        "text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 " +
                        (STATUS_STYLES[p.status || "planning"] || STATUS_STYLES.planning)
                      }
                    >
                      {(p.status || "planning").replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  {p.description && <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>}
                  {typeof p.progress === "number" && (
                    <div>
                      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{p.progress}% complete</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span
                      className={
                        "px-2 py-0.5 rounded-full border font-bold " +
                        (PRIORITY_STYLES[p.priority || "medium"] || PRIORITY_STYLES.medium)
                      }
                    >
                      {(p.priority || "medium").toUpperCase()}
                    </span>
                    {p.ownerId === user?.id ? (
                      <span className="text-primary font-bold">Owner</span>
                    ) : (
                      <span>Team project</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
