"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Download, Table as TableIcon, CheckCircle2, AlertCircle, Clock, MapPin, Search } from "lucide-react";
import { fetchAttendanceRecordsAction } from "@/lib/actions/attendance-actions";
import { AttendanceRecord } from "@/lib/db/attendance";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"table" | "calendar">("table");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  const loadAttendance = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const res = await fetchAttendanceRecordsAction({ date: selectedDate });
    if (res.success && res.records) {
      setRecords(res.records);
    }
    if (!isSilent) setLoading(false);
  };

  useEffect(() => {
    loadAttendance();

    const interval = setInterval(() => {
      loadAttendance(true);
    }, 10000);

    const handlePunchUpdate = () => {
      loadAttendance(true);
    };
    window.addEventListener("attendance-updated", handlePunchUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handlePunchUpdate);
    };
  }, [selectedDate]);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = ["Date", "Employee Name", "Email", "Employee Code", "Status", "Punch In", "Punch Out", "Work Hours", "Location"];
    const csvRows = [headers.join(",")];

    records.forEach((r) => {
      const row = [
        r.date,
        `"${r.userName}"`,
        `"${r.userEmail}"`,
        `"${r.employeeCode || ""}"`,
        r.status,
        r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString() : "",
        r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : "",
        r.workHours || 0,
        `"${r.location || ""}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `attendance_export_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
  };

  const filteredRecords = records.filter(
    (r) =>
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employeeCode && r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AppShell title="Attendance & Shift Logs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Control & Shift Logs</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Office Hours: <strong>10:00 AM – 7:00 PM</strong> · GPS Geofenced Punch Records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 border-gray-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Top Universal Punch Card */}
      <div className="mb-8">
        <AttendancePunchCard />
      </div>

      {/* Main Content Card with Tabs */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        {/* Tab Switcher & Date Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "table"
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <TableIcon className="h-4 w-4" /> Table View
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "calendar"
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarDays className="h-4 w-4" /> Calendar View
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  isToday
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y.toISOString().split("T")[0]);
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().split("T")[0]; })()
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Custom Date Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
            />
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tab 1: Table View */}
        {activeTab === "table" && (
          <div>
            {loading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">Loading attendance records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No attendance punch records found for today. Use the punch card above to mark attendance!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Employee</th>
                      <th className="pb-3 font-semibold">Code</th>
                      <th className="pb-3 font-semibold">Punch In</th>
                      <th className="pb-3 font-semibold">Punch Out</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                    {filteredRecords.map((r) => (
                      <tr key={r._id}>
                        <td className="py-3 font-mono font-medium">{r.date}</td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {r.userName}
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">{r.userEmail}</span>
                        </td>
                        <td className="py-3 font-mono text-primary font-semibold">{r.employeeCode || "EMP-2026-1001"}</td>
                        <td className="py-3 font-mono">
                          {r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="py-3 font-mono">
                          {r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active Shift"}
                        </td>
                        <td className="py-3">
                          {r.status === "PRESENT" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              PRESENT
                            </span>
                          ) : r.status === "LATE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                              LATE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              HALF DAY
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[150px]">
                          {r.location || "Office"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Calendar View */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Monthly Attendance Calendar Overview</h4>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-2 border-b border-gray-200 dark:border-white/10">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>

            {/* 31 Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => {
                const dayNum = i + 1;
                const match = filteredRecords.find((r) => {
                  const day = new Date(r.date).getDate();
                  return day === dayNum;
                });

                return (
                  <div
                    key={dayNum}
                    className={`h-20 p-2 rounded-xl border flex flex-col justify-between text-xs font-semibold ${
                      match
                        ? "border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white"
                        : "border-gray-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <span className="font-mono text-xs">{dayNum}</span>
                    {match ? (
                      <div>
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{match.status}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(match.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
