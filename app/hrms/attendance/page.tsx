"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download, Table as TableIcon, Search, Building2 } from "lucide-react";
import { fetchAttendanceRecordsAction } from "@/lib/actions/attendance-actions";
import { AttendanceRecord } from "@/lib/db/attendance";
import { useAuth } from "@/components/providers/auth-provider";

const DEPARTMENTS = ["All Departments", "Development", "Marketing", "Sales", "Executive"];

export default function AttendancePage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const isStaff = user?.role === "super_admin" || user?.role === "hr_admin" || user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"table" | "calendar">("table");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All Departments");
  const [searchQuery, setSearchQuery] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === todayStr;

  const loadAttendance = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const deptFilter = isManager
      ? (user?.department || "Development")
      : (isStaff && selectedDepartment !== "All Departments" ? selectedDepartment : undefined);
    const res = await fetchAttendanceRecordsAction({
      date: selectedDate,
      department: deptFilter,
    });
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
  }, [selectedDate, selectedDepartment, user?.department, isManager]);

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      "Date",
      "Employee Name",
      "Email",
      "Department",
      "Employee Code",
      "Status",
      "Punch In",
      "Punch Out",
      "Work Hours",
      "Location",
    ];
    const csvRows = [headers.join(",")];

    records.forEach((r) => {
      const row = [
        r.date,
        `"${r.userName}"`,
        `"${r.userEmail}"`,
        `"${r.department || (isManager ? (user?.department || "Development") : "")}"`,
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
    a.setAttribute("download", `attendance_export_${selectedDate}.csv`);
    a.click();
  };

  const filteredRecords = records.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.userName.toLowerCase().includes(q) ||
      r.userEmail.toLowerCase().includes(q) ||
      (r.employeeCode && r.employeeCode.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (isManager) {
      const targetDept = (user?.department || "Development").toLowerCase().trim();
      const recDept = (r.department || "").toLowerCase().trim();
      if (recDept && recDept !== targetDept) return false;
    }

    if (isStaff && selectedDepartment !== "All Departments") {
      return r.department && r.department.toLowerCase() === selectedDepartment.toLowerCase();
    }
    return true;
  });

  return (
    <AppShell title={isManager ? "Team Attendance & Shift Logs" : "Attendance & Shift Logs"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isManager ? "Team Attendance & Shift Logs" : "Attendance Control & Shift Logs"}
            </h2>
            {isManager && (
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2.5 py-0.5"
              >
                {user?.department || "Development"} Team
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isManager
              ? `Displaying verified shift logs and GPS punch records for the ${user?.department || "Development"} team.`
              : "Office Hours: 10:00 AM to 7:00 PM, GPS Geofenced Punch Records"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 border-gray-300 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-semibold"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Content Card with Tabs */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
        {/* Tab Switcher & Date Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/70">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/70">
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  activeTab === "table"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-4 w-4" /> Table View
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  activeTab === "calendar"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="h-4 w-4" /> Calendar View
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/70">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors duration-150 ${
                  isToday
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white"
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
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors duration-150 ${
                  selectedDate ===
                  (() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    return y.toISOString().split("T")[0];
                  })()
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white"
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
              className="rounded-xl border border-border bg-slate-50 dark:bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
            />

            {/* Department Filter for Admins */}
            {isStaff && (
              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-xl border border-border/70">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-popover text-popover-foreground">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={isManager ? "Search team by name, code..." : "Search by name, email, code..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Tab 1: Table View */}
        {activeTab === "table" && (
          <div>
            {loading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                Loading attendance records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                {isManager
                  ? `No attendance punch records found for the ${user?.department || "Development"} team on this date.`
                  : "No attendance punch records found for this date."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Employee</th>
                      <th className="pb-3 font-semibold">Department</th>
                      <th className="pb-3 font-semibold">Code</th>
                      <th className="pb-3 font-semibold">Punch In</th>
                      <th className="pb-3 font-semibold">Punch Out</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                    {filteredRecords.map((r) => (
                      <tr key={r._id || `${r.userId}-${r.date}`}>
                        <td className="py-3 font-mono font-medium">{r.date}</td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          {r.userName}
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            {r.userEmail}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground border border-border/60">
                            {r.department || (isManager ? user?.department || "Development" : "General")}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-primary font-semibold">{r.employeeCode || "—"}</td>
                        <td className="py-3 font-mono">
                          {r.punchInTime
                            ? new Date(r.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="py-3 font-mono">
                          {r.punchOutTime
                            ? new Date(r.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Active Shift"}
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
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {isManager
                ? `Monthly Team Attendance Calendar Overview (${user?.department || "Development"})`
                : "Monthly Attendance Calendar Overview"}
            </h4>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400 pb-2 border-b border-border">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* 31 Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => {
                const dayNum = i + 1;
                const matches = filteredRecords.filter((r) => {
                  const day = new Date(r.date).getDate();
                  return day === dayNum;
                });
                const hasMatch = matches.length > 0;

                return (
                  <div
                    key={dayNum}
                    className={`min-h-20 p-2 rounded-xl border flex flex-col justify-between text-xs font-semibold ${
                      hasMatch
                        ? "border-emerald-500/30 bg-emerald-500/5 text-slate-900 dark:text-white"
                        : "border-gray-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{dayNum}</span>
                      {hasMatch && (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          {matches.length} {matches.length === 1 ? "log" : "logs"}
                        </span>
                      )}
                    </div>
                    {hasMatch ? (
                      <div className="space-y-0.5 mt-1">
                        <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          {matches[0].status}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block truncate">
                          {matches[0].userName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-400">N/A</span>
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
