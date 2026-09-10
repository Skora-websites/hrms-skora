"use client";

import { useState, useEffect } from "react";
import { FileText, Filter, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  ip?: string;
}

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/audit-logs");
      if (res.ok) setLogs((await res.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const filtered = logs.filter((l) => {
    const matchSearch = l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchFilter;
  });

  const actionTypes = [...new Set(logs.map((l) => l.action))];

  return (
    <AppShell title="Audit Logs">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            System activity log — who did what, and when
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          >
            <option value="all">All Actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading audit logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No audit logs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Action</th>
                  <th className="pb-3 font-semibold">Resource</th>
                  <th className="pb-3 font-semibold">Details</th>
                  <th className="pb-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.slice(0, 50).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 font-mono text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-3 font-bold">{log.userName}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border bg-primary/10 text-primary border-primary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{log.resource}</td>
                    <td className="py-3 text-slate-500 max-w-[200px] truncate">{log.details}</td>
                    <td className="py-3 font-mono text-[10px] text-slate-400">{log.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
