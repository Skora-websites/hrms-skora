"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  Coffee,
  AlertTriangle,
  Radio,
  Zap,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  punchInAction,
  punchOutAction,
  updateAUXStateAction,
  submitEarlyDepartureAction,
} from "@/lib/actions/attendance-actions";
import {
  isWithinGeofence,
  evaluateGeofencePunch,
  DEFAULT_OFFICE_COORDINATES,
} from "@/lib/geofencing";
import { cn } from "@/lib/utils";

interface MobilePunchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordUpdated?: () => void;
}

type AuxState = "active" | "on_break" | "meeting";

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

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MobilePunchSheet({
  open,
  onOpenChange,
  onRecordUpdated,
}: MobilePunchSheetProps) {
  const { user } = useAuth();
  const userId = user?.id || "";

  const [currentTime, setCurrentTime] = useState("");
  const [currentSeconds, setCurrentSeconds] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [auxPending, setAuxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Geolocation
  const [geoStatus, setGeoStatus] = useState<{
    distance?: number;
    accuracy?: number;
    within?: boolean;
    isDrift?: boolean;
    error?: string;
  } | null>(null);
  const [locating, setLocating] = useState(false);

  // Early punch out confirmation
  const [showEarlyPrompt, setShowEarlyPrompt] = useState(false);
  const [earlyReason, setEarlyReason] = useState("");

  // Live timer for elapsed work
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 1. Clock Ticker in IST
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(now);
      const secStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        second: "2-digit",
      }).format(now);
      const dateStr = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(now);

      setCurrentTime(timeStr);
      setCurrentSeconds(secStr);
      setTodayDate(dateStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const dateKey = todayString();
      const res = await fetch(
        `/api/hrm/v2/attendance?userId=${encodeURIComponent(userId)}&date=${encodeURIComponent(dateKey)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        const todayRec = rows[0] || null;
        setRecord(todayRec);
        if (todayRec?.punchInTime && !todayRec?.punchOutTime) {
          const punchInMs = new Date(todayRec.punchInTime).getTime();
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - punchInMs) / 1000)));
        }
      }
    } catch {
      // Ignore initial silent fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      fetchTodayAttendance();
      checkLocation();
    }
  }, [open, fetchTodayAttendance]);

  // Elapsed timer when active
  useEffect(() => {
    if (!record?.punchInTime || record?.punchOutTime) return;
    const interval = setInterval(() => {
      const punchInMs = new Date(record.punchInTime).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - punchInMs) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [record]);

  // Check Geolocation
  const checkLocation = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus({ error: "Geolocation not supported" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const evalResult = evaluateGeofencePunch({
          userLat: pos.coords.latitude,
          userLng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          officeLat: DEFAULT_OFFICE_COORDINATES.latitude,
          officeLng: DEFAULT_OFFICE_COORDINATES.longitude,
          officeRadius: DEFAULT_OFFICE_COORDINATES.radiusMeters,
        });
        setGeoStatus({
          distance: evalResult.distanceMeters,
          accuracy: Math.round(pos.coords.accuracy),
          within: evalResult.allowed && evalResult.tier === "on_premise_gps",
          isDrift: evalResult.tier === "indoor_drift_exception",
        });
        setLocating(false);
      },
      (err) => {
        setGeoStatus({ error: err.message || "Location permission denied" });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Tactile feedback
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  const isPunchedIn = Boolean(record?.punchInTime && !record?.punchOutTime);
  const isPunchedOut = Boolean(record?.punchOutTime);

  // Handle Punch In
  const handlePunchIn = async () => {
    if (!userId) return;
    setActionPending(true);
    setError(null);
    setSuccess(null);
    triggerHaptic([20, 40, 20]);

    try {
      const result = await punchInAction({
        userId,
        userName: user?.name || "Employee",
        userEmail: user?.email || "",
        employeeCode: user?.employeeCode || undefined,
        workLocation: geoStatus?.within ? "office" : "remote",
        currentLocation: geoStatus ? { distance: geoStatus.distance, accuracy: geoStatus.accuracy } : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to punch in");
      }

      triggerHaptic(50);
      setSuccess("Punched in successfully! Have a productive shift.");
      await fetchTodayAttendance();
      onRecordUpdated?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Error punching in. Please retry.");
    } finally {
      setActionPending(false);
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    if (!userId) return;
    const hour = istHourNow();
    // Office shift ends at 19:00 (7:00 PM). If earlier, prompt for early reason
    if (hour < 19 && !showEarlyPrompt) {
      setShowEarlyPrompt(true);
      return;
    }

    setActionPending(true);
    setError(null);
    setSuccess(null);
    triggerHaptic([25, 40, 25]);

    try {
      const dateStr = todayString();
      if (showEarlyPrompt && earlyReason.trim()) {
        await submitEarlyDepartureAction(userId, dateStr, earlyReason.trim());
      }

      const result = await punchOutAction(userId, dateStr);
      if (!result.success) {
        throw new Error(result.error || "Failed to punch out");
      }

      triggerHaptic(50);
      setSuccess("Punched out successfully. Rest well!");
      setShowEarlyPrompt(false);
      setEarlyReason("");
      await fetchTodayAttendance();
      onRecordUpdated?.();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Error punching out. Please retry.");
    } finally {
      setActionPending(false);
    }
  };

  // AUX state switch (Break / Meeting / Active)
  const handleAuxSwitch = async (nextState: AuxState) => {
    if (!userId || !record) return;
    setAuxPending(true);
    triggerHaptic(15);
    try {
      const res = await updateAUXStateAction(userId, todayString(), nextState);
      if (res.success) {
        setRecord((prev: any) => ({ ...prev, auxState: nextState }));
        onRecordUpdated?.();
      }
    } catch {
      // Ignore
    } finally {
      setAuxPending(false);
    }
  };

  const currentAux: AuxState = (record?.auxState as AuxState) || "active";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        className="bottom-0 top-auto translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0 border-t border-border/80 p-5 pt-3 max-w-lg w-full pb-[max(env(safe-area-inset-bottom),20px)] shadow-[0_-12px_40px_rgba(0,0,0,0.2)] bg-card/95 backdrop-blur-2xl"
      >
        {/* Grab Handle Pill */}
        <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 mx-auto mb-3" />

        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-ping" />
              <DialogTitle className="text-base font-bold text-foreground tracking-tight">
                Quick Punch
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium border-border/80">
              Shift: 10 AM – 7 PM
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{todayDate}</p>
        </DialogHeader>

        {/* Digital Clock Display */}
        <div className="my-2 p-4 rounded-2xl bg-muted/40 border border-border/60 text-center relative overflow-hidden">
          <div className="text-3xl font-extrabold tracking-tight text-foreground flex items-baseline justify-center gap-1.5 font-mono">
            <span>{currentTime || "10:00 AM"}</span>
            <span className="text-xs text-muted-foreground font-normal">:{currentSeconds || "00"}</span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Mon – Sat (15m grace to 10:15 AM)</span>
          </div>

          {/* Active Work Timer */}
          {isPunchedIn && (
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-around text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground">In Time</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {record?.punchInTime
                    ? new Date(record.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div>
                <p className="text-[11px] text-muted-foreground">Active Duration</p>
                <p className="font-mono font-semibold text-foreground">
                  {formatDuration(elapsedSeconds)}
                </p>
              </div>
              <div className="h-6 w-px bg-border/60" />
              <div>
                <p className="text-[11px] text-muted-foreground">Status</p>
                <span className="font-medium capitalize text-primary text-[11px]">
                  {currentAux.replace("_", " ")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Geofence & Location Tag */}
        <div className="p-2.5 rounded-xl bg-background/60 border border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            {locating ? (
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Verifying location...
              </span>
            ) : geoStatus?.within ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
                Office Perimeter ({geoStatus.distance}m)
              </span>
            ) : geoStatus?.isDrift ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium truncate">
                Indoor Drift ({geoStatus.distance}m) — Signed
              </span>
            ) : (
              <span className="text-muted-foreground truncate">
                {geoStatus?.distance ? `${geoStatus.distance}m from office (Remote)` : "GPS Ready"}
              </span>
            )}
          </div>
          <button
            onClick={checkLocation}
            className="text-[11px] text-primary hover:underline font-medium shrink-0 ml-2"
          >
            Refresh
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{success}</span>
          </div>
        )}

        {/* Early Punch Out Prompt */}
        {showEarlyPrompt && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Early Departure (Shift ends at 7:00 PM)</span>
            </div>
            <input
              type="text"
              placeholder="Reason for early departure (required)..."
              value={earlyReason}
              onChange={(e) => setEarlyReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowEarlyPrompt(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!earlyReason.trim() || actionPending}
                onClick={handlePunchOut}
              >
                {actionPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Confirm Punch Out
              </Button>
            </div>
          </div>
        )}

        {/* AUX Controls if Punched In */}
        {isPunchedIn && !showEarlyPrompt && (
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAuxSwitch("active")}
              disabled={auxPending || currentAux === "active"}
              className={cn(
                "py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center flex flex-col items-center gap-1",
                currentAux === "active"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Active</span>
            </button>
            <button
              onClick={() => handleAuxSwitch("on_break")}
              disabled={auxPending || currentAux === "on_break"}
              className={cn(
                "py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center flex flex-col items-center gap-1",
                currentAux === "on_break"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Break</span>
            </button>
            <button
              onClick={() => handleAuxSwitch("meeting")}
              disabled={auxPending || currentAux === "meeting"}
              className={cn(
                "py-2 px-1 text-xs font-medium rounded-xl border transition-all text-center flex flex-col items-center gap-1",
                currentAux === "meeting"
                  ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
              )}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Meeting</span>
            </button>
          </div>
        )}

        {/* Main Punch Action Button */}
        {!showEarlyPrompt && (
          <div className="pt-1">
            {isPunchedOut ? (
              <div className="p-3 text-center rounded-2xl bg-muted/60 border border-border/60">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-foreground">Attendance Completed for Today</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Out at{" "}
                  {record?.punchOutTime
                    ? new Date(record.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </p>
              </div>
            ) : isPunchedIn ? (
              <Button
                variant="destructive"
                size="lg"
                className="w-full h-12 text-sm font-bold rounded-2xl shadow-md active:scale-98 transition-transform"
                disabled={actionPending}
                onClick={handlePunchOut}
              >
                {actionPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Punch Out
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full h-12 text-sm font-bold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg active:scale-98 transition-transform"
                disabled={actionPending || loading}
                onClick={handlePunchIn}
              >
                {actionPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Punch In Now
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
