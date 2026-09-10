"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Search, Loader2, X, CheckCircle2 } from "lucide-react";

interface Project { _id?: string; id?: string; name: string; description?: string; status?: string; budget?: number; priority?: string; }

export default function HrAdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState("planning");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Edit state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editStatus, setEditStatus] = useState("planning");

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/projects");
      if (res.ok) { const d = await res.json(); setProjects(Array.isArray(d.data) ? d.data : []); }
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hrm/v2/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), budget: budget ? Number(budget) : undefined, status }),
      });
      if (res.ok) { setMsg("Project created"); setShowCreate(false); setName(""); setDesc(""); setBudget(""); setStatus("planning"); loadProjects(); }
      else { const err = await res.json(); setMsg(err.error || "Failed"); }
    } catch { setMsg("Network error"); }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try { await fetch("/api/hrm/v2/projects?id=" + id, { method: "DELETE" }); setMsg("Project deleted"); loadProjects(); } catch {}
    setTimeout(() => setMsg(null), 3000);
  };

  const startEdit = (p: Project) => {
    setEditingProject(p);
    setEditName(p.name || "");
    setEditDesc(p.description || "");
    setEditBudget(p.budget ? String(p.budget) : "");
    setEditStatus(p.status || "planning");
  };

  const handleUpdate = async () => {
    if (!editingProject || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hrm/v2/projects?id=" + (editingProject._id || editingProject.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
          budget: editBudget ? Number(editBudget) : 0,
          status: editStatus,
        }),
      });
      if (res.ok) {
        setMsg("Project updated");
        setEditingProject(null);
        loadProjects();
      } else {
        const err = await res.json();
        setMsg(err.error || "Update failed");
      }
    } catch {
      setMsg("Network error");
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const filtered = projects.filter(p => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()));
  const activeCount = projects.filter(p => p.status === "active" || p.status === "in_progress").length;

  return (
    <AppShell title="Projects">
      {msg && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-lg">
          <CheckCircle2 className="h-4 w-4" />{msg}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{projects.length} total &middot; {activeCount} active</p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" /></div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary text-white gap-2 font-bold text-xs"><Plus className="h-4 w-4" />Create Project</Button>
        </div>
      </div>
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm text-slate-900 dark:text-white">New Project</h3><button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button></div>
            <input type="text" placeholder="Project name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Budget (₹)" value={budget} onChange={e => setBudget(e.target.value)} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
              <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !name.trim()} className="bg-primary text-white font-bold text-xs">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button>
            </div>
          </div>
        </div>
      )}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Project</h3><button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button></div>
            <input type="text" placeholder="Project name" value={editName} onChange={e => setEditName(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            <textarea placeholder="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Budget (₹)" value={editBudget} onChange={e => setEditBudget(e.target.value)} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProject(null)} className="text-xs">Cancel</Button>
              <Button onClick={handleUpdate} disabled={saving || !editName.trim()} className="bg-primary text-white font-bold text-xs">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs"><Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" /><p className="font-semibold">No projects yet</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p._id || p.id} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 p-4 space-y-2 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.name}</h3>
                  <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold border " + (p.status === "active" || p.status === "in_progress" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : p.status === "completed" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-gray-500/10 text-gray-600 border-gray-500/20")}>{(p.status || "planning").toUpperCase()}</span>
                </div>
                {p.description && <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  {p.budget ? <span className="font-bold">Budget: ₹{p.budget.toLocaleString()}</span> : <span className="text-slate-300 dark:text-slate-600">No budget set</span>}
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(p)} className="text-primary hover:text-primary/80 font-bold">Edit</button>
                    <button onClick={() => handleDelete(p._id || p.id || "")} className="text-red-400 hover:text-red-600 font-bold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
