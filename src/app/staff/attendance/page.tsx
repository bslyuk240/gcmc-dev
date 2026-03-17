"use client";

import { useState, useEffect, useRef } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";

type AttendanceStatus = "Present" | "Late" | "Half-day" | "Absent" | "Leave" | "Holiday";

type AttendanceRecord = {
  id: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  status: AttendanceStatus;
  unit: string;
};

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  Present:  "bg-emerald-100 text-emerald-700",
  Late:     "bg-amber-100 text-amber-700",
  "Half-day":"bg-sky-100 text-sky-700",
  Absent:   "bg-red-100 text-red-700",
  Leave:    "bg-violet-100 text-violet-700",
  Holiday:  "bg-slate-100 text-slate-600",
};

const MOCK_HISTORY: AttendanceRecord[] = [
  { id: "att-01", date: "2026-03-14", clockIn: "06:58", clockOut: "14:05", hours: 7.1,  status: "Present",  unit: "ICU"        },
  { id: "att-02", date: "2026-03-13", clockIn: "07:12", clockOut: "14:02", hours: 6.8,  status: "Late",     unit: "ICU"        },
  { id: "att-03", date: "2026-03-12", clockIn: "07:00", clockOut: "14:00", hours: 7.0,  status: "Present",  unit: "Ward A"     },
  { id: "att-04", date: "2026-03-11", clockIn: "—",     clockOut: "—",     hours: 0,    status: "Leave",    unit: "—"          },
  { id: "att-05", date: "2026-03-10", clockIn: "14:02", clockOut: "21:00", hours: 7.0,  status: "Present",  unit: "Ward A"     },
  { id: "att-06", date: "2026-03-09", clockIn: "06:55", clockOut: "14:10", hours: 7.2,  status: "Present",  unit: "Emergency"  },
  { id: "att-07", date: "2026-03-08", clockIn: "07:45", clockOut: "14:00", hours: 6.2,  status: "Late",     unit: "ICU"        },
  { id: "att-08", date: "2026-03-07", clockIn: "07:01", clockOut: "14:05", hours: 7.1,  status: "Present",  unit: "ICU"        },
  { id: "att-09", date: "2026-03-06", clockIn: "—",     clockOut: "—",     hours: 0,    status: "Absent",   unit: "—"          },
  { id: "att-10", date: "2026-03-05", clockIn: "07:00", clockOut: "14:00", hours: 7.0,  status: "Present",  unit: "Outpatient" },
  { id: "att-11", date: "2026-03-04", clockIn: "07:00", clockOut: "14:00", hours: 7.0,  status: "Present",  unit: "Ward A"     },
  { id: "att-12", date: "2026-03-03", clockIn: "—",     clockOut: "—",     hours: 0,    status: "Holiday",  unit: "—"          },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const session = useHMSSession();

  // Clock state
  const [clockedIn,   setClockedIn]   = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [elapsed,     setElapsed]     = useState("00:00:00");
  const startRef = useRef<number | null>(null);

  const [history, setHistory] = useState<AttendanceRecord[]>(MOCK_HISTORY);

  useEffect(() => {
    const saved = sessionStorage.getItem("staff_clock_in");
    if (saved) {
      const { time, ts } = JSON.parse(saved) as { time: string; ts: number };
      setClockedIn(true);
      setClockInTime(time);
      startRef.current = ts;
    }
  }, []);

  // Timer
  useEffect(() => {
    if (!clockedIn || !startRef.current) return;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current!) / 1000);
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(id);
  }, [clockedIn]);

  function handleClockIn() {
    const now  = Date.now();
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setClockedIn(true);
    setClockInTime(time);
    setClockOutTime(null);
    startRef.current = now;
    sessionStorage.setItem("staff_clock_in", JSON.stringify({ time, ts: now }));
  }

  function handleClockOut() {
    const now     = Date.now();
    const outTime = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const inTime  = clockInTime ?? "—";
    const secs    = startRef.current ? Math.floor((now - startRef.current) / 1000) : 0;
    const hours   = Math.round((secs / 3600) * 10) / 10;
    const today   = todayISO();

    // Update history: add today's record
    const newRecord: AttendanceRecord = {
      id: `att-today-${Date.now()}`,
      date: today,
      clockIn: inTime,
      clockOut: outTime,
      hours,
      status: clockInTime && clockInTime > "07:10" ? "Late" : "Present",
      unit: "—",
    };
    setHistory((prev) => {
      const withoutToday = prev.filter((r) => r.date !== today);
      return [newRecord, ...withoutToday];
    });

    setClockedIn(false);
    setClockInTime(null);
    setClockOutTime(outTime);
    setElapsed("00:00:00");
    startRef.current = null;
    sessionStorage.removeItem("staff_clock_in");
  }

  // Monthly stats
  const march      = history.filter((r) => r.date.startsWith("2026-03"));
  const present    = march.filter((r) => r.status === "Present" || r.status === "Late").length;
  const absent     = march.filter((r) => r.status === "Absent").length;
  const late       = march.filter((r) => r.status === "Late").length;
  const totalHours = march.reduce((s, r) => s + r.hours, 0);

  const isLate      = clockInTime && clockInTime > "07:10";
  const todayRecord = history.find((r) => r.date === todayISO());

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Attendance</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {session?.full_name} · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── Clock card ──────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 transition-all ${
        clockedIn ? "border-emerald-200 bg-emerald-50" : clockOutTime ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"
      }`}>
        {clockedIn ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">On Duty</p>
                <p className="font-mono text-3xl font-black text-emerald-700 leading-none mt-1">{elapsed}</p>
                <p className="text-sm text-emerald-600 mt-1">Clocked in at {clockInTime}{isLate ? " · Late" : ""}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleClockOut}
              className="w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition"
            >
              Clock Out
            </button>
          </div>
        ) : clockOutTime && !todayRecord?.clockOut ? (
          <div className="text-center">
            <p className="text-2xl font-black text-slate-700">✓ Clocked out</p>
            <p className="mt-1 text-sm text-slate-500">At {clockOutTime} · Today's attendance recorded.</p>
          </div>
        ) : todayRecord ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s Record</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  In: {todayRecord.clockIn} → Out: {todayRecord.clockOut}
                </p>
                <p className="text-sm text-slate-500">{todayRecord.hours}h · {todayRecord.unit}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[todayRecord.status]}`}>
                {todayRecord.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Not Clocked In</p>
              <p className="mt-1 text-sm text-slate-500">
                {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — Tap to start your shift
              </p>
            </div>
            <button
              onClick={handleClockIn}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition"
            >
              Clock In
            </button>
          </div>
        )}
      </div>

      {/* ── Monthly summary ──────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">March 2026 Summary</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Days Present", value: present,             color: "text-emerald-700" },
            { label: "Late",         value: late,                color: "text-amber-600" },
            { label: "Absent",       value: absent,              color: "text-red-600" },
            { label: "Total Hours",  value: `${totalHours.toFixed(0)}h`, color: "text-indigo-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white px-2 py-3 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] font-semibold text-slate-400 leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attendance history ───────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recent Records</p>
        <div className="space-y-1.5">
          {history.map((r) => (
            <div key={r.id} className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 ${r.date === todayISO() ? "border-indigo-200" : "border-slate-100"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{formatDate(r.date)}</p>
                  {r.date === todayISO() && (
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">Today</span>
                  )}
                </div>
                {r.status !== "Absent" && r.status !== "Holiday" && r.status !== "Leave" ? (
                  <p className="text-xs text-slate-400">{r.clockIn} → {r.clockOut} · {r.hours}h · {r.unit}</p>
                ) : (
                  <p className="text-xs text-slate-400">{r.status}</p>
                )}
              </div>
              <span className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[r.status]}`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-slate-300">
        Attendance discrepancies? Contact HR within 48 hours.
      </p>
    </div>
  );
}
