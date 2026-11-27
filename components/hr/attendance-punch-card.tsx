"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Coffee, LogOut, Zap, Users, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { punchInAction, punchOutAction, updateAUXStateAction, submitEarlyDepartureAction } from "@/lib/actions/attendance-actions";
import { isWithinGeofence, DEFAULT_OFFICE_COORDINATES } from "@/lib/geofencing";

interface OfficeRules {
  officeStart: number;
  officeEnd: number;
  lateAfter: number;
  workDays: number[];
  halfDayAfter: number;
}

type AuxState = "active" | "on_break" | "meeting";

const DEFAULT_RULES: OfficeRules = {
  officeStart: 10,
  officeEnd: 19,
  lateAfter: 10.5,
  workDays: [1, 2, 3, 4, 5, 6],
  halfDayAfter: 14.5,
};

function todayString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function istHourNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const [h, m] = parts.split(":").map(Number);
  return h + m / 60;
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
  const [today, setToday] = useState(() => todayString());
  const [record, setRecord] = useState<any | null>(null);
  const [rules, setRules] = useState<OfficeRules>(DEFAULT_RULES);
  const [officeCoords, setOfficeCoords] = useState(DEFAULT_OFFICE_COORDINATES);
  const [gpsStatus, setGpsStatus] = useState<{ distance?: number; accuracy?: number; within?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [auxSwitching, setAuxSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEarlyLeave, setShowEarlyLeave] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const refreshAttendance = useCallback(async (dateKey: string) => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/hrm/v2/attendance?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(dateKey)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load today's attendance");
      const data = await response.json();
      const rows = Array.isArray(data.data) ? data.data : [];
      setRecord(rows[0] || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load today's attendance");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = todayString();
      setToday((prev) => {
        if (prev === next) return prev;
        refreshAttendance(next);
        return next;
      });
    }, 60000);
    return () => window.clearInterval(interval);
  }, [refreshAttendance]);

  useEffect(() => {
    refreshAttendance(today);
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
        if (data.officeRules?.officeLocation?.lat && data.officeRules?.officeLocation?.lng) {
          setOfficeCoords({
            latitude: Number(data.officeRules.officeLocation.lat),
            longitude: Number(data.officeRules.officeLocation.lng),
            radiusMeters: Number(data.officeRules.officeLocation.radiusMeters) || 100,
          });
        }
      } catch { /* server defaults remain in place */ }
    };
    loadConfig();
  }, [refreshAttendance, today]);

  const punchedIn = Boolean(record?.punchInTime);
  const punchedOut = Boolean(record?.punchOutTime);
  const auxState: AuxState = record?.auxState === "on_break" || record?.auxState === "meeting" ? record.auxState : "active";

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
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [punchedIn, punchedOut]);

  // GPS Geolocation reader
  const getGpsPosition = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          console.warn("[GPS] High-accuracy geolocation failed, attempting standard accuracy:", err.message);
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    });
  };

  const handlePunchIn = async () => {
    setError(null);
    setSuccess(null);
    setPunching(true);
    try {
      const currentHour = istHourNow();
      const status = currentHour > rules.halfDayAfter ? "HALF_DAY" : currentHour > rules.lateAfter ? "LATE" : "PRESENT";

      let location = "Office";
      let workLocation = "office";
      let currentLocationData: any = undefined;

      const pos = await getGpsPosition();
      if (pos) {
        const { latitude, longitude, accuracy } = pos.coords;
        const res = isWithinGeofence(latitude, longitude, officeCoords.latitude, officeCoords.longitude, officeCoords.radiusMeters);
        workLocation = res.within ? "office" : "remote";
        location = `${res.within ? "In Office" : "Remote"} (${Math.round(res.distance)}m)`;
        currentLocationData = {
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          distanceFromOffice: Math.round(res.distance),
          withinGeofence: res.within,
          timestamp: new Date().toISOString(),
        };
        setGpsStatus({ distance: Math.round(res.distance), accuracy: Math.round(accuracy), within: res.within });
      }

      const punch = await punchInAction({
        userId,
        userName: user?.name || user?.email || "Employee",
        userEmail: user?.email || "",
        status,
        location,
        workLocation,
        currentLocation: currentLocationData,
      });

      if (!punch.success || !punch.record) throw new Error(punch.error || "Attendance was not saved. Please try again.");
      setRecord(punch.record);
      setSuccess(`Attendance recorded (${location}).`);
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { type: "punch-in", record: punch.record } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attendance could not be recorded.");
    } finally {
      setPunching(false);
    }
  };

  const executePunchOut = async () => {
    setError(null);
    setSuccess(null);
    setPunching(true);
    try {
      const result = await punchOutAction(userId, today);
      if (!result.success) throw new Error(result.error || "Punch-out was not saved.");
      await refreshAttendance(today);
      setSuccess("Punch-out recorded successfully.");
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: { type: "punch-out", userId } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Punch-out could not be recorded.");
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    const currentHour = istHourNow();
    if (rules.workDays.includes(new Date().getDay()) && currentHour < rules.officeEnd) {
      setShowEarlyLeave(true);
      return;
    }
    await executePunchOut();
  };

  const submitEarlyLeave = async () => {
    if (!earlyReason.trim()) {
      setError("Please provide a reason for early departure.");
      return;
    }
    setSendingRequest(true);
    setError(null);
    try {
      const response = await submitEarlyDepartureAction(userId, today, earlyReason.trim());
      if (!response.success) throw new Error(response.error || "Approval request could not be submitted.");
      setShowEarlyLeave(false);
      setEarlyReason("");
      setSuccess("Early departure request sent. Punching out now...");
      await executePunchOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval request failed.");
    } finally {
      setSendingRequest(false);
    }
  };

  const changeAux = async (next: AuxState) => {
    if (next === auxState || auxSwitching || !punchedIn || punchedOut) return;
    setAuxSwitching(true);
    setError(null);
    try {
      const result = await updateAUXStateAction(userId, today, next);
      if (!result.success || !result.record) throw new Error(result.error || "AUX state could not be updated.");
      setRecord(result.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AUX state could not be updated.");
    } finally {
      setAuxSwitching(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-sm text-muted-foreground">Loading attendance…</div>;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border/70">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Daily Attendance and Shift Punch
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Office: <strong>{formatHour(rules.officeStart)} to {formatHour(rules.officeEnd)}</strong></span>
            <span className="text-border">|</span>
            <span>Late after: <strong>{formatHour(rules.lateAfter)}</strong></span>
            <span className="text-border">|</span>
            <span>GPS Geofencing Active</span>
          </p>
        </div>
        {punchedIn && !punchedOut && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:animate-none" />
            <span>Live ({record?.workLocation === "remote" ? "Remote" : "In Office"})</span>
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl bg-muted/40 border border-border/70">
        <div className="min-w-0 space-y-1">
          <span className="text-xs text-muted-foreground block">{punchedIn ? "Punched In at:" : "Status:"}</span>
          <p className="text-base font-bold text-foreground leading-tight">{punchedIn ? new Date(record.punchInTime).toLocaleTimeString() : "Not Punched In Today"}</p>
          {punchedOut && <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Out: {new Date(record.punchOutTime).toLocaleTimeString()}</p>}
          {punchedIn && <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Status: {record.status || "PRESENT"}</div>}
          {record?.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{record.location}</span>
            </p>
          )}
          {gpsStatus?.distance !== undefined && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Navigation className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{gpsStatus.distance}m from office {gpsStatus.accuracy ? `(±${gpsStatus.accuracy}m GPS accuracy)` : ""}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-stretch gap-3">
          <div className="flex flex-col items-center justify-center bg-background px-4 py-3 rounded-xl border border-border/80 shadow-xs min-w-0">
            <span className="font-mono text-2xl sm:text-[28px] font-extrabold tracking-wider text-foreground tabular-nums leading-none">{formatDuration(effectiveSeconds)}</span>
            <span className="text-[11px] text-muted-foreground mt-1.5 font-medium">Effective Work Time</span>
          </div>

          <div className="flex items-stretch">
            {!punchedIn ? (
              <Button onClick={handlePunchIn} disabled={punching} className="w-full sm:w-auto sm:min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-5 h-full min-h-11 py-3 shadow-sm justify-center whitespace-nowrap">
                {punching ? "Verifying GPS…" : (
                  <>
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>Punch In</span>
                  </>
                )}
              </Button>
            ) : punchedOut ? (
              <span className="inline-flex w-full sm:w-auto sm:min-w-[140px] items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 min-h-11">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Shift Complete</span>
              </span>
            ) : (
              <Button onClick={handlePunchOut} disabled={punching} variant="danger" className="w-full sm:w-auto sm:min-w-[140px] font-bold gap-2 px-5 h-full min-h-11 py-3 shadow-sm justify-center whitespace-nowrap">
                <LogOut className="h-4 w-4 shrink-0" />
                <span>{punching ? "Saving…" : "Punch Out"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {!punchedIn && (
        <p className="text-xs text-muted-foreground mt-3 text-center flex items-center justify-center gap-1.5 font-medium">
          <Navigation className="h-3 w-3 text-primary" />
          <span>GPS geofencing verified on punch-in (Office radius: {officeCoords.radiusMeters}m).</span>
        </p>
      )}

      {punchedIn && !punchedOut && (
        <div className="mt-4 p-4 rounded-xl bg-muted/40 border border-border/70">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" /> AUX Status
          </div>
          <div className="flex gap-2">
            {(["active", "on_break", "meeting"] as AuxState[]).map((state) => (
              <button
                key={state}
                onClick={() => changeAux(state)}
                disabled={auxSwitching}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors duration-150 cursor-pointer ${
                  auxState === state
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-background border-border/80 text-foreground hover:bg-muted"
                }`}
              >
                {state === "active" ? (
                  <>
                    <Zap className="inline h-3.5 w-3.5 mr-1" />
                    Active
                  </>
                ) : state === "on_break" ? (
                  <>
                    <Coffee className="inline h-3.5 w-3.5 mr-1" />
                    On Break
                  </>
                ) : (
                  <>
                    <Users className="inline h-3.5 w-3.5 mr-1" />
                    Meeting
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {showEarlyLeave && (
        <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Early departure request</h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Your shift hours are not complete yet. Submit a reason for early departure to proceed with punch-out.
          </p>
          <textarea
            value={earlyReason}
            onChange={(e) => setEarlyReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="mt-3 w-full rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
            placeholder="Reason for early departure"
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={submitEarlyLeave} disabled={sendingRequest} className="gap-2">
              {sendingRequest ? "Submitting…" : "Confirm & Punch Out"}
            </Button>
            <Button onClick={() => setShowEarlyLeave(false)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
