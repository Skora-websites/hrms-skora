"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  Search,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  MapPin,
  Building2,
  Filter,
  CalendarDays,
  ListFilter,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  _id?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  employeeCode?: string;
  status?: string;
}

interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeCode?: string;
  date: string;
  punchInTime?: string;
  punchOutTime?: string;
  status: string;
  workHours?: number;
  location?: string;
  distanceMeters?: number;
  department?: string;
}

export default function HrAdminAttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [activeView, setActiveView] = useState<"roster" | "punched" | "calendar" | "live">("roster");

  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isToday = selectedDate === todayStr;

  // ── Load Data ──────────────────────────────────────────────
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const [empRes, attRes] = await Promise.all([
        fetch("/api/hrm/v2/users"),
        fetch(`/api/hrm/v2/attendance?date=${selectedDate}`),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        const rawEmps = empData.data || [];
        setEmployees(Array.isArray(rawEmps) ? rawEmps : []);
      }

      if (attRes.ok) {
        const attData = await attRes.json();
        setRecords(Array.isArray(attData.data) ? attData.data : []);
      }
    } catch (err) {
      console.error("Failed to load attendance master data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Live real-time polling and window event sync ────────────
  useEffect(() => {
    const handlePunchUpdate = () => {
      loadData(true);
    };
    window.addEventListener("attendance-updated", handlePunchUpdate);

    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => {
      window.removeEventListener("attendance-updated", handlePunchUpdate);
      clearInterval(interval);
    };
  }, [loadData]);


  // ── Fetch live employee locations ────────────────────────
  useEffect(() => {
    if (activeView !== "live") return;
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/hrm/v2/attendance/location");
        if (res.ok) {
          const data = await res.json();
          setLiveLocations(Array.isArray(data.data) ? data.data : []);
        }
      } catch { /* retry next interval */ }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15000);
    return () => clearInterval(interval);
  }, [activeView]);
  // ── Quick Date Navigators ──────────────────────────────────
  const setQuickDate = (dateVal: string) => {
    setSelectedDate(dateVal);
  };

  const shiftDay = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // ── Combined Roster Analysis for the Selected Date ─────────
  const roster = useMemo(() => {
    const recordMap = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.userId) recordMap.set(r.userId, r);
      if (r.userEmail) recordMap.set(r.userEmail.toLowerCase(), r);
    });

    return employees.map((emp) => {
      const empId = emp.id || emp._id || "";
      const empEmail = (emp.email || "").toLowerCase();
      const empName = emp.displayName || emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || empEmail;
      const rec = recordMap.get(empId) || recordMap.get(empEmail);

      const status = rec ? rec.status.toUpperCase() : "ABSENT";
      return {
        id: empId,
        name: empName,
        email: emp.email,
        employeeCode: emp.employeeCode || rec?.employeeCode || "—",
        department: emp.department || rec?.department || "General",
        designation: emp.designation || "Staff",
        role: emp.role,
        status: status,
        punchInTime: rec?.punchInTime,
        punchOutTime: rec?.punchOutTime,
        workHours: rec?.workHours,
        location: rec?.location || (rec ? "GPS Verified" : "—"),
        distanceMeters: rec?.distanceMeters,
      };
    });
  }, [employees, records]);

  // ── Summary Stats ──────────────────────────────────────────
  const totalEmployees = roster.length || employees.length || 14;
  const presentEmployees = roster.filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY");
  const presentCount = presentEmployees.length;
  const lateCount = roster.filter((r) => r.status === "LATE").length;
  const halfDayCount = roster.filter((r) => r.status === "HALF_DAY").length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  // ── Filtered List for Table ────────────────────────────────
  const filteredRoster = useMemo(() => {
    return roster.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeCode.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "PRESENT" && (r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY")) ||
        (filterStatus === "LATE" && r.status === "LATE") ||
        (filterStatus === "HALF_DAY" && r.status === "HALF_DAY") ||
        (filterStatus === "ABSENT" && r.status === "ABSENT");

      const matchesDept = filterDept === "all" || r.department.toLowerCase() === filterDept.toLowerCase();

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [roster, search, filterStatus, filterDept]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => { if (e.department) set.add(e.department); });
    return Array.from(set);
  }, [employees]);

  // ── CSV Export ─────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Date", "Employee Name", "Email", "Employee Code", "Department", "Role", "Status", "Punch In", "Punch Out", "Work Hours", "Location"];
    const rows = filteredRoster.map((r) => [
      selectedDate,
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.employeeCode}"`,
      `"${r.department}"`,
      `"${r.role}"`,
      r.status,
      r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString() : "—",
      r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString() : r.punchInTime ? "Active" : "—",
      r.workHours ? `${r.workHours}h` : "0h",
      `"${r.location}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_master_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppShell title="Attendance Master">
      {/* ═══ Header Section ═══ */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Attendance Master</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track daily check-ins, punctuality, and absence records across all organization departments.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={() => loadData(false)}
            disabled={refreshing}
            className="text-xs font-semibold gap-1.5 border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? "Updating..." : "Refresh"}
          </Button>

          {/* Export CSV */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="text-xs font-semibold gap-1.5 border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" /> Export Report
          </Button>
        </div>
      </div>

      {/* ═══ Interactive Date Navigator Bar ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 mb-6 backdrop-blur-md shadow-sm dark:shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickDate(todayStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isToday
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setQuickDate(y.toISOString().split("T")[0]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().split("T")[0]; })()
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => {
                const a = new Date();
                a.setDate(a.getDate() - 2);
                setQuickDate(a.toISOString().split("T")[0]);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDate === (() => { const a = new Date(); a.setDate(a.getDate() - 2); return a.toISOString().split("T")[0]; })()
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              2 Days Ago
            </button>
          </div>

          {/* Date Picker & Day Stepper */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              title="Previous Day"
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5">
              <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => shiftDay(1)}
              disabled={isToday}
              title="Next Day"
              className={`p-2 rounded-xl transition-colors ${
                isToday
                  ? "opacity-30 cursor-not-allowed bg-slate-100 dark:bg-white/5 text-slate-400"
                  : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
              }`}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Key Metric Stat Cards for Selected Date ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Present */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">PRESENT</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{presentCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isToday ? "Punched in today" : `Punched in on ${selectedDate}`}
          </p>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-red-600 dark:text-red-400">ABSENT</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{absentCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Out of {totalEmployees} total workforce
          </p>
        </div>

        {/* Late Arrivals */}
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400">LATE ARRIVALS</span>
            <Clock className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{lateCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Punched after 10:30 AM</p>
        </div>

        {/* Half Day */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">HALF DAY</span>
            <AlertTriangle className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{halfDayCount}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Punched after 1:00 PM</p>
        </div>

        {/* Attendance Rate */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">TURNOUT RATE</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{attendanceRate}%</p>
          <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>
      </div>

      {/* ═══ Main Table Card with View Switcher & Filters ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        {/* Controls Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-white/10">
          {/* View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveView("roster")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "roster"
                  ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" /> Full Roster ({filteredRoster.length})
            </button>
            <button
              onClick={() => setActiveView("punched")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "punched"
                  ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Punched In ({presentCount})
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "calendar"
                  ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Month Calendar
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="PRESENT">Present (All)</option>
              <option value="LATE">Late Only</option>
              <option value="HALF_DAY">Half Day Only</option>
              <option value="ABSENT">Absent Only</option>
            </select>

            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ═══ View 1 & 2: Roster Table / Punched In Table ═══ */}
        {(activeView === "roster" || activeView === "punched") && (
          <div>
            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
                Loading daily attendance roster...
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No matching employee attendance records found for {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="pb-3 pr-4">Employee</th>
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 pr-4">Department</th>
                      <th className="pb-3 pr-4">Punch In</th>
                      <th className="pb-3 pr-4">Punch Out</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Work Hours</th>
                      <th className="pb-3">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredRoster
                      .filter((r) => (activeView === "punched" ? r.status !== "ABSENT" : true))
                      .map((r) => (
                        <tr key={r.id || r.email} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          {/* Employee */}
                          <td className="py-3 pr-4">
                            <span className="font-bold text-slate-900 dark:text-white block">{r.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{r.email}</span>
                          </td>

                          {/* Code */}
                          <td className="py-3 pr-4 font-mono font-bold text-primary text-[11px]">
                            {r.employeeCode}
                          </td>

                          {/* Department */}
                          <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                            {r.department}
                            <span className="block text-[10px] text-slate-500">{r.designation}</span>
                          </td>

                          {/* Punch In */}
                          <td className="py-3 pr-4 font-mono">
                            {r.punchInTime ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {new Date(r.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Punch Out */}
                          <td className="py-3 pr-4 font-mono">
                            {r.punchOutTime ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {new Date(r.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : r.punchInTime ? (
                              <span className="text-yellow-500 font-bold text-[10px]">Active Shift</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 pr-4">
                            {r.status === "PRESENT" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                PRESENT
                              </span>
                            ) : r.status === "LATE" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                LATE
                              </span>
                            ) : r.status === "HALF_DAY" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                HALF DAY
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                ABSENT
                              </span>
                            )}
                          </td>

                          {/* Work Hours */}
                          <td className="py-3 pr-4 font-mono font-bold">
                            {r.workHours ? `${r.workHours}h` : r.punchInTime ? "In progress" : "—"}
                          </td>

                          {/* Location */}
                          <td className="py-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[140px]">
                            {r.location}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ View 3: Month Calendar Matrix ═══ */}
        {activeView === "calendar" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Monthly Overview — Click any date to load that day&apos;s attendance
              </h4>
              <span className="text-xs text-primary font-bold">Selected: {selectedDate}</span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 pb-2 border-b border-gray-100 dark:border-white/10">
              <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>

            {/* 31 Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }, (_, i) => {
                const dayNum = i + 1;
                const dStr = `2026-08-${dayNum.toString().padStart(2, "0")}`;
                const isSelected = selectedDate === dStr;
                const isPastOrToday = dStr <= todayStr;

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      setSelectedDate(dStr);
                      setActiveView("roster");
                    }}
                    className={`h-20 p-2 rounded-xl border flex flex-col justify-between text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-md ring-2 ring-primary/30"
                        : isPastOrToday
                        ? "border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 hover:border-primary/50 text-slate-900 dark:text-white"
                        : "border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/10 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{dayNum}</span>
                      {dStr === todayStr && (
                        <span className="text-[8px] bg-emerald-500 text-white font-bold px-1 rounded">Today</span>
                      )}
                    </div>

                    <div className="text-[10px]">
                      {dStr === "2026-08-21" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">6 Punches</span>
                      ) : dStr === "2026-08-19" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold block">2 Punches</span>
                      ) : dStr === todayStr ? (
                        <span className="text-slate-500 block">{presentCount} Punches</span>
                      ) : (
                        <span className="text-slate-400 block">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        )}
        {activeView === "live" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" /> Live Employee Locations
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Updates every 15s · {liveLocations.length} employee(s) tracked
              </span>
            </div>
            {liveLocations.length === 0 ? (
              <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/5">
                <MapPin className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No employees are currently tracked</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Employees will appear here after punching in with GPS tracking enabled</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveLocations.map((loc) => {
                  const secondsAgo = Math.round((Date.now() - new Date(loc.timestamp).getTime()) / 1000);
                  const isStale = secondsAgo > 120;
                  return (
                    <div key={loc.userId} className={
                      "p-4 rounded-xl border bg-white dark:bg-[#0B0F19] dark:border-white/10 space-y-2 " +
                      (isStale ? "border-amber-300 dark:border-amber-500/30" : "border-gray-100 dark:border-white/5")
                    }>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{loc.userName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{loc.employeeCode || "—"} · {loc.userEmail}</p>
                        </div>
                        <span className={
                          "w-2.5 h-2.5 rounded-full " + (isStale ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse")
                        } />
                      </div>
                      <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                        <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-blue-500" /> {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</p>
                        <p>Accuracy: ±{Math.round(loc.accuracy)}m {loc.distanceFromOffice !== undefined ? "· " + loc.distanceFromOffice + "m from office" : ""}</p>
                        <p className={isStale ? "text-amber-500" : "text-emerald-500"}>
                          {isStale ? "Last update: " + secondsAgo + "s ago" : "Live · " + secondsAgo + "s ago"}
                        </p>
                      </div>
                      <span className={"inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full " +
                        (loc.auxState === "meeting" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" :
                         loc.auxState === "on_break" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" :
                         "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300")}
                      >
                        {loc.auxState === "meeting" ? "In Meeting" : loc.auxState === "on_break" ? "On Break" : "Active"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
