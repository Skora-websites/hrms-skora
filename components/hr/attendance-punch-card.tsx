"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Coffee, LogOut, MapPin, Navigation, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { punchInAction, punchOutAction, updateAUXStateAction } from "@/lib/actions/attendance-actions";
import { isWithinGeofence } from "@/lib/geofencing";

interface OfficeLocation { latitude: number; longitude: number; radius: number; }
interface OfficeRules { officeStart: number; officeEnd: number; lateAfter: number; workDays: number[]; halfDayAfter: number; }
type AuxState = "active" | "on_break" | "meeting";

const DEFAULT_OFFICE: OfficeLocation = { latitude: 28.6007594, longitude: 77.4319307, radius: 100 };
const DEFAULT_RULES: OfficeRules = { officeStart: 10, officeEnd: 19, lateAfter: 10.5, workDays: [1, 2, 3, 4, 5], halfDayAfter: 14.5 };

// Key attendance by the office calendar date (IST) so the client and server
// always agree on which records belong to "today", regardless of device timezone.
function todayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatHour(hour: number) {
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  const normalized = h % 24;
  const ampm = normalized >= 12 ? "PM" : "AM";
  const display = normalized === 0 ? 12 : normalized > 12 ? normalized - 12 : normalized;
  return `${display}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AttendancePunchCard() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const today = useMemo(() => todayString(), []);
  const [record, setRecord] = useState<any | null>(null);
  const [office, setOffice] = useState<OfficeLocation>(DEFAULT_OFFICE);
  const [rules, setRules] = useState<OfficeRules>(DEFAULT_RULES);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [auxSwitching, setAuxSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEarlyLeave, setShowEarlyLeave] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const watchRef = useRef<number | null>(null);

  const refreshAttendance = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/hrm/v2/attendance?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(today)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load today's attendance");
      const data = await response.json();
      const rows = Array.isArray(data.data) ? data.data : [];
      setRecord(rows[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load today's attendance");
    } finally {
      setLoading(false);
    }
  }, [today, userId]);

  useEffect(() => {
    refreshAttendance();
    const loadConfig = async () => {
      try {
        const response = await fetch("/api/hrm/v2/tenants/current", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setRules({
          officeStart: data.officeRules?.officeStart ?? DEFAULT_RULES.officeStart,
          officeEnd: data.officeRules?.officeEnd ?? DEFAULT_RULES.officeEnd,
          lateAfter: data.officeRules?.lateAfter ?? DEFAULT_RULES.lateAfter,
          workDays: data.officeRules?.workDays ?? DEFAULT_RULES.workDays,
          halfDayAfter: data.officeRules?.halfDayAfter ?? DEFAULT_RULES.halfDayAfter,
        });
        if (Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          setOffice({ latitude: Number(data.latitude), longitude: Number(data.longitude), radius: Number(data.geofenceRadius) || 100 });
        }
      } catch { /* server defaults remain in place */ }
    };
    loadConfig();
  }, [refreshAttendance]);

  const punchedIn = Boolean(record?.punchInTime);
  const punchedOut = Boolean(record?.punchOutTime);
  const auxState: AuxState = record?.auxState === "on_break" || record?.auxState === "meeting" ? record.auxState : "active";
  const workLocation = record?.workLocation || (record?.location?.includes?.("[remote]") ? "remote" : "office");

  // `tick` is a dependency on purpose: the 1s interval updates it so this memo
  // recomputes and the timer keeps counting live instead of freezing at mount.
  const [tick, setTick] = useState(0);

  const effectiveSeconds = useMemo(() => {
    void tick;
    if (!record?.punchInTime) return 0;
    const history = Array.isArray(record.auxHistory) ? record.auxHistory : [];
    const now = Date.now();
    let total = 0;
    for (const period of history) {
      if (period.state !== "active" && period.state !== "meeting") continue;
      const start = new Date(period.startTime).getTime();
      const end = period.endTime ? new Date(period.endTime).getTime() : now;
      if (Number.isFinite(start)) total += Math.max(0, end - start);
    }
    if (history.length === 0) total = Math.max(0, now - new Date(record.punchInTime).getTime());
    return Math.floor(total / 1000);
  }, [record, tick]);

  useEffect(() => {
    if (!punchedIn || punchedOut) return;
    const id = window.setInterval(() => setTick(v => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [punchedIn, punchedOut]);

  useEffect(() => () => {
    if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation is required for attendance."));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  });

  const handlePunchIn = async () => {
    setError(null); setSuccess(null); setPunching(true);
    try {
      if (!rules.workDays.includes(new Date().getDay())) throw new Error("Today is a scheduled weekly off.");
      const position = await getPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      setGpsAccuracy(accuracy);
      const result = isWithinGeofence(lat, lng, office.latitude, office.longitude, office.radius);
      setDistance(result.distance);
      const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
      const isOffice = result.within;
      if (isOffice && currentHour < rules.officeStart) throw new Error(`Office hours start at ${formatHour(rules.officeStart)}.`);
      if (isOffice && currentHour >= rules.officeEnd + 1) throw new Error(`Late punch-ins are not accepted after ${formatHour(rules.officeEnd + 1)}.`);
      const status = isOffice ? (currentHour > rules.lateAfter ? "LATE" : currentHour >= rules.halfDayAfter ? "HALF_DAY" : "PRESENT") : "WFH";
      const punch = await punchInAction({
        userId,
        userName: user?.name || user?.email || "Employee",
        userEmail: user?.email || "",
        location: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (${Math.round(result.distance)}m from office) [${isOffice ? "office" : "remote"}]`,
        status,
        workLocation: isOffice ? "office" : "remote",
      });
      if (!punch.success || !punch.record) throw new Error(punch.error || "Attendance was not saved. Please try again.");
      setRecord(punch.record);
      setSuccess("Attendance recorded successfully.");
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { type: "punch-in", record: punch.record } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attendance could not be recorded.");
    } finally { setPunching(false); }
  };

  const executePunchOut = async () => {
    setError(null); setSuccess(null); setPunching(true);
    try {
      const result = await punchOutAction(userId, today);
      if (!result.success) throw new Error(result.error || "Punch-out was not saved.");
      await refreshAttendance();
      setSuccess("Punch-out recorded successfully.");
      if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { type: "punch-out", userId } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Punch-out could not be recorded.");
    } finally { setPunching(false); }
  };

  const handlePunchOut = async () => {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    if (rules.workDays.includes(new Date().getDay()) && hour < rules.officeEnd) {
      setShowEarlyLeave(true);
      return;
    }
    await executePunchOut();
  };

  const submitEarlyLeave = async () => {
    if (!earlyReason.trim()) { setError("Please enter a reason for early departure."); return; }
    setSendingRequest(true); setError(null);
    try {
      const response = await fetch("/api/hrm/v2/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_to_role", role: "hr_admin", title: "Early Departure Approval Required", body: `${user?.name || user?.email} requested early punch-out. Reason: ${earlyReason.trim()}.`, type: "approval", referenceType: "early_departure", referenceId: userId }),
      });
      if (!response.ok) throw new Error("Approval request could not be submitted.");
      setShowEarlyLeave(false); setEarlyReason("");
      setSuccess("Early departure request sent. Your attendance remains open until punch-out is completed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Approval request failed."); }
    finally { setSendingRequest(false); }
  };

  const changeAux = async (next: AuxState) => {
    if (next === auxState || auxSwitching || !punchedIn || punchedOut) return;
    setAuxSwitching(true); setError(null);
    try {
      const result = await updateAUXStateAction(userId, today, next);
      if (!result.success || !result.record) throw new Error(result.error || "AUX state could not be updated.");
      setRecord(result.record);
    } catch (e) { setError(e instanceof Error ? e.message : "AUX state could not be updated."); }
    finally { setAuxSwitching(false); }
  };

  if (loading) return <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 text-sm text-slate-500">Loading attendance…</div>;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Daily Attendance &amp; Shift Punch</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Office: <strong>{formatHour(rules.officeStart)} – {formatHour(rules.officeEnd)}</strong> · Late after <strong>{formatHour(rules.lateAfter)}</strong></p>
        </div>
        {punchedIn && !punchedOut && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">LIVE · {workLocation === "remote" ? "Remote" : "Office"}</span>}
      </div>

      {error && <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
      {success && <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /><span>{success}</span></div>}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/5">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{punchedIn ? "Punched In at:" : "Status:"}</span>
          <p className="text-base font-bold mt-1">{punchedIn ? new Date(record.punchInTime).toLocaleTimeString() : "Not Punched In Today"}</p>
          {punchedOut && <p className="text-sm font-semibold text-emerald-600 mt-1">Out: {new Date(record.punchOutTime).toLocaleTimeString()}</p>}
          {punchedIn && <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">Status: {record.status || "PRESENT"}</div>}
          {record?.location && <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> {record.location}</p>}
          {distance !== null && <p className="text-[11px] text-slate-500 mt-1"><Navigation className="inline h-3 w-3" /> {Math.round(distance)}m from office{gpsAccuracy ? ` · GPS ±${Math.round(gpsAccuracy)}m` : ""}</p>}
        </div>

        <div className="text-center bg-white dark:bg-black/60 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10">
          <span className="font-mono text-3xl font-extrabold tracking-wider">{formatDuration(effectiveSeconds)}</span>
          <span className="text-[10px] text-slate-500 block mt-1">Effective Work Time</span>
        </div>

        <div>
          {!punchedIn ? (
            <Button onClick={handlePunchIn} disabled={punching} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6 h-11">{punching ? "Validating…" : <><MapPin className="h-4 w-4" /> Punch In</>}</Button>
          ) : punchedOut ? (
            <span className="text-xs font-bold text-emerald-600 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50">✓ Shift Complete</span>
          ) : (
            <Button onClick={handlePunchOut} disabled={punching} variant="danger" className="font-bold gap-2 px-6 h-11"><LogOut className="h-4 w-4" /> {punching ? "Saving…" : "Punch Out"}</Button>
          )}
        </div>
      </div>

      {!punchedIn && <p className="text-[10px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> GPS verification is required to punch in.</p>}

      {punchedIn && !punchedOut && <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold"><Zap className="h-3.5 w-3.5 text-primary" /> AUX Status</div>
        <div className="flex gap-2">
          {(["active", "on_break", "meeting"] as AuxState[]).map(state => (
            <button key={state} onClick={() => changeAux(state)} disabled={auxSwitching} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${auxState === state ? "bg-primary text-white border-primary" : "bg-white dark:bg-black/40 border-gray-200 dark:border-white/10"}`}>
              {state === "active" ? <><Zap className="inline h-3.5 w-3.5 mr-1" />Active</> : state === "on_break" ? <><Coffee className="inline h-3.5 w-3.5 mr-1" />On Break</> : <><Users className="inline h-3.5 w-3.5 mr-1" />Meeting</>}
            </button>
          ))}
        </div>
      </div>}

      {showEarlyLeave && <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4">
        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Early departure request</h4>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Your attendance will remain open. Submit a reason for HR approval, then punch out after approval.</p>
        <textarea value={earlyReason} onChange={e => setEarlyReason(e.target.value)} rows={3} maxLength={500} className="mt-3 w-full rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-900" placeholder="Reason for early departure" />
        <div className="flex gap-2 mt-3">
          <Button onClick={submitEarlyLeave} disabled={sendingRequest} className="gap-2">{sendingRequest ? "Sending…" : "Request Approval"}</Button>
          <Button onClick={() => setShowEarlyLeave(false)} variant="outline">Cancel</Button>
        </div>
      </div>}
    </div>
  );
}
