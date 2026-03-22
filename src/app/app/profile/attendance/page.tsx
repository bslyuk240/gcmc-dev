"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/modules/workforce/attendance/types";
import {
  clockInAppAttendance,
  clockOutAppAttendance,
  currentMonthRange,
  fetchAppAttendanceRecords,
  formatAttendanceClockTime,
  formatAttendanceDate,
  isLateClockIn,
  todayAttendanceDate,
} from "@/lib/attendance/client";

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-100 text-emerald-700",
  Late: "bg-amber-100 text-amber-700",
  "Half-day": "bg-sky-100 text-sky-700",
  Absent: "bg-red-100 text-red-700",
  Leave: "bg-violet-100 text-violet-700",
  Holiday: "bg-slate-100 text-slate-600",
};

function monthLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function dayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function computeElapsed(startMs: number | null) {
  if (!startMs) return "00:00:00";
  const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function AppProfileAttendancePage() {
  const session = useHMSSession();
  const startRef = useRef<number | null>(null);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  const { from, to } = useMemo(() => currentMonthRange(), []);
  const today = useMemo(() => todayAttendanceDate(), []);

  const todayRecord = records.find((record) => record.attendanceDate === today) ?? null;
  const clockedIn = Boolean(todayRecord?.clockInAt && !todayRecord?.clockOutAt);
  const clockInTime = formatAttendanceClockTime(todayRecord?.clockInAt);
  const clockOutTime = formatAttendanceClockTime(todayRecord?.clockOutAt);
  const isLate = isLateClockIn(todayRecord?.clockInAt);

  const currentMonthRecords = records.filter((record) => record.attendanceDate >= from && record.attendanceDate <= to);
  const present = currentMonthRecords.filter((record) => record.status === "Present" || record.status === "Late").length;
  const absent = currentMonthRecords.filter((record) => record.status === "Absent").length;
  const late = currentMonthRecords.filter((record) => record.status === "Late").length;
  const totalHours = currentMonthRecords.reduce((sum, record) => sum + record.hours, 0);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      if (!session?.staff_id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAppAttendanceRecords({ from, to });
        if (!cancelled) {
          setRecords(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load attendance.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [from, session?.staff_id, to]);

  useEffect(() => {
    if (!todayRecord?.clockInAt || todayRecord.clockOutAt) {
      startRef.current = null;
      setElapsed("00:00:00");
      return;
    }

    const startMs = new Date(todayRecord.clockInAt).getTime();
    startRef.current = Number.isNaN(startMs) ? null : startMs;
    setElapsed(computeElapsed(startRef.current));
  }, [todayRecord?.clockInAt, todayRecord?.clockOutAt]);

  useEffect(() => {
    if (!clockedIn || !startRef.current) return;
    const id = window.setInterval(() => {
      setElapsed(computeElapsed(startRef.current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [clockedIn]);

  async function refreshAttendance() {
    if (!session?.staff_id) return;
    try {
      const data = await fetchAppAttendanceRecords({ from, to });
      setRecords(data);
    } catch {
      // Keep the last loaded records if the refresh fails after a successful save.
    }
  }

  async function handleClockIn() {
    if (!session) return;
    setSaving(true);
    setError(null);

    const now = new Date();
    const clockInAt = now.toISOString();

    try {
      await clockInAppAttendance({
        attendanceDate: todayAttendanceDate(now),
        clockInAt,
        status: isLateClockIn(clockInAt) ? "Late" : "Present",
        unit: session.department,
      });
      await refreshAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock in.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClockOut() {
    if (!session) return;
    setSaving(true);
    setError(null);

    try {
      await clockOutAppAttendance({
        attendanceDate: todayAttendanceDate(),
        clockOutAt: new Date().toISOString(),
      });
      await refreshAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock out.");
    } finally {
      setSaving(false);
    }
  }

  if (!session || loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Attendance</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {session.full_name} · {dayLabel()}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div
        className={`rounded-2xl border p-5 transition-all ${
          clockedIn ? "border-emerald-200 bg-emerald-50" : todayRecord?.clockOutAt ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"
        }`}
      >
        {clockedIn ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">On Duty</p>
                <p className="mt-1 font-mono text-3xl font-black leading-none text-emerald-700">
                  {elapsed}
                </p>
                <p className="mt-1 text-sm text-emerald-600">
                  Clocked in at {clockInTime}{isLate ? " · Late" : ""}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <button
              onClick={handleClockOut}
              disabled={saving}
              className="w-full rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Clock Out"}
            </button>
          </div>
        ) : todayRecord?.clockOutAt ? (
          <div className="text-center">
            <p className="text-2xl font-black text-slate-700">Clocked out</p>
            <p className="mt-1 text-sm text-slate-500">
              At {clockOutTime} · Today&apos;s attendance recorded.
            </p>
          </div>
        ) : todayRecord ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s Record</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">
                  In: {clockInTime} → Out: {clockOutTime}
                </p>
                <p className="text-sm text-slate-500">
                  {todayRecord.hours}h · {todayRecord.unit ?? "—"}
                </p>
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
              disabled={saving}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Clock In"}
            </button>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          {monthLabel()} Summary
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Days Present", value: present, color: "text-emerald-700" },
            { label: "Late", value: late, color: "text-amber-600" },
            { label: "Absent", value: absent, color: "text-red-600" },
            { label: "Total Hours", value: `${totalHours.toFixed(0)}h`, color: "text-indigo-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-2 py-3 text-center">
              <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
              <p className="mt-0.5 text-[9px] font-semibold leading-tight text-slate-400">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recent Records</p>
        <div className="space-y-1.5">
          {currentMonthRecords.length > 0 ? (
            currentMonthRecords.map((record) => (
              <div
                key={record.id}
                className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 ${
                  record.attendanceDate === today ? "border-indigo-200" : "border-slate-100"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatAttendanceDate(record.attendanceDate)}
                    </p>
                    {record.attendanceDate === today && (
                      <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
                        Today
                      </span>
                    )}
                  </div>
                  {record.status !== "Absent" && record.status !== "Holiday" && record.status !== "Leave" ? (
                    <p className="text-xs text-slate-400">
                      {formatAttendanceClockTime(record.clockInAt)} → {formatAttendanceClockTime(record.clockOutAt)} · {record.hours}h · {record.unit ?? "—"}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">{record.status}</p>
                  )}
                </div>
                <span className={`ml-3 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[record.status]}`}>
                  {record.status}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              No attendance records found for this month.
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-300">
        Attendance discrepancies? Contact HR within 48 hours.
      </p>
    </div>
  );
}
