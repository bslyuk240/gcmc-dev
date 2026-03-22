"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { fetchStaffShifts, fetchLeaveRequests, type StaffShift } from "@/lib/supabase/db";

// ─── constants ─────────────────────────────────────────────────────────────────
const DEPT_LABELS: Record<string, string> = {
  frontdesk: "Front Desk", doctors: "Doctors", nurses: "Nurses Bay",
  pharmacy: "Pharmacy", lab: "Laboratory", accounts: "Accounts",
  store: "Store", admin: "Admin", hr: "HR", it: "IT",
};

const SHIFT_COLORS: Record<string, string> = {
  morning:   "bg-amber-50  text-amber-700  border-amber-200",
  afternoon: "bg-sky-50    text-sky-700    border-sky-200",
  evening:   "bg-violet-50 text-violet-700 border-violet-200",
  night:     "bg-slate-100 text-slate-700  border-slate-200",
  on_call:   "bg-red-50    text-red-700    border-red-200",
};


// Quick-access tiles
const QUICK_TILES = [
  { href: "/staff/my-rota",      label: "My Rota",       sub: "View shift schedule",      icon: "📅", color: "bg-amber-50  border-amber-100" },
  { href: "/staff/leave",        label: "Leave",          sub: "Apply or track requests",  icon: "✈️",  color: "bg-sky-50    border-sky-100" },
  { href: "/staff/payslips",     label: "Payslips",       sub: "Download salary slips",    icon: "₦",  color: "bg-emerald-50 border-emerald-100" },
  { href: "/staff/attendance",   label: "Attendance",     sub: "Clock in / view records",  icon: "🕐",  color: "bg-violet-50 border-violet-100" },
  { href: "/staff/documents",    label: "Documents",      sub: "Contracts & certificates", icon: "📄",  color: "bg-indigo-50  border-indigo-100" },
  { href: "/staff/notifications",label: "Notifications",  sub: "Alerts and messages",      icon: "🔔",  color: "bg-red-50    border-red-100" },
];

// ─── helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function greet(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name.split(" ")[0]}`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function StaffDashboardPage() {
  const session = useHMSSession();
  const avatarUrl = session?.avatar_url?.trim() ?? null;
  const initials = session?.full_name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  // Attendance
  const [clockedIn,   setClockedIn]   = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [elapsed,     setElapsed]     = useState("00:00:00");
  const startRef = useRef<number | null>(null);

  // Shift and leave data from Supabase
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [leaveBalance, setLeaveBalance] = useState({ annual: { daysUsed: 0, daysTotal: 21 }, sick: { daysUsed: 0, daysTotal: 10 } });

  // Notifications from shared store
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; message: string; time: string; read: boolean }>>([]);

  useEffect(() => {
    if (!session?.staff_id) return;
    fetchStaffShifts(session.staff_id).then(setShifts).catch(() => {});
    fetchLeaveRequests().then((reqs) => {
      const mine = reqs.filter((r) => r.staffId === session.staff_id);
      const annualUsed = mine.filter((r) => r.leaveType === "Annual" && r.status === "Approved").reduce((s, r) => s + r.days, 0);
      const sickUsed = mine.filter((r) => r.leaveType === "Sick" && r.status === "Approved").reduce((s, r) => s + r.days, 0);
      setLeaveBalance({ annual: { daysUsed: annualUsed, daysTotal: 21 }, sick: { daysUsed: sickUsed, daysTotal: 10 } });
    }).catch(() => {});
  }, [session?.staff_id]);

  useEffect(() => {
    const id = setTimeout(() => {
      // Load attendance state from sessionStorage (resets on tab close — intentional for clock-in)
      const saved = sessionStorage.getItem("staff_clock_in");
      if (saved) {
        const { time, ts } = JSON.parse(saved) as { time: string; ts: number };
        setClockedIn(true);
        setClockInTime(time);
        startRef.current = ts;
      }
      // Load notifications
      try {
        const raw = localStorage.getItem("hms_notifications");
        if (raw) {
          const all = JSON.parse(raw) as Array<{ id: string; title: string; message: string; createdAt?: string; read?: boolean; targetDepartment?: string }>;
          const mine = all
            .filter((n) => !n.read)
            .filter((n) => !n.targetDepartment || n.targetDepartment === session?.department)
            .slice(0, 3);
          setNotifs(mine.map((n) => ({ id: n.id, title: n.title, message: n.message, time: n.createdAt ?? "", read: !!n.read })));
        }
      } catch { /* ignore */ }
    }, 0);
    return () => clearTimeout(id);
  }, [session?.department]);

  // Live elapsed timer
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
    const now   = Date.now();
    const time  = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setClockedIn(true);
    setClockInTime(time);
    startRef.current = now;
    sessionStorage.setItem("staff_clock_in", JSON.stringify({ time, ts: now }));
  }
  function handleClockOut() {
    setClockedIn(false);
    setClockInTime(null);
    startRef.current = null;
    setElapsed("00:00:00");
    sessionStorage.removeItem("staff_clock_in");
  }

  // Compute upcoming shifts (today + forward)
  const todayStr   = today();
  const upcoming   = shifts.filter((s) => s.shiftDate >= todayStr).sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
  const nextShift  = upcoming[0] ?? null;
  const isOnShift  = nextShift?.shiftDate === todayStr;

  // Leave balance
  const annualLeft = leaveBalance.annual.daysTotal - leaveBalance.annual.daysUsed;

  if (!session) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl px-5 py-5 text-white ${
          avatarUrl ? "border border-indigo-200" : "bg-gradient-to-br from-indigo-600 to-indigo-700"
        }`}
      >
        {avatarUrl ? (
          <>
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-90"
              style={{ backgroundImage: `url(${avatarUrl})` }}
            />
            <div className="absolute inset-0 bg-slate-950/45" />
          </>
        ) : null}

        <div className="relative flex items-start gap-4">
          <Link
            href="/staff/profile"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-2xl font-black text-white shadow-sm"
            aria-label="Open staff profile"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-indigo-200">{greet(session.full_name)}</p>
            <h1 className="mt-1 truncate text-2xl font-black">{session.full_name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-indigo-200">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold">
                {DEPT_LABELS[session.department] ?? session.department}
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-semibold capitalize">
                {session.role.replace(/_/g, " ")}
              </span>
              {isOnShift && nextShift && (
                <span className="rounded-full bg-emerald-400/30 px-2.5 py-0.5 font-semibold text-emerald-200">
                  On shift today · {nextShift.unit}
                </span>
              )}
            </div>
            <Link
              href={`/app/${session.department}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              Go to Work Portal
            </Link>
          </div>
        </div>
      </div>

      {/* ── Attendance / Clock-in card ───────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 transition-all ${clockedIn ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {clockedIn ? (
              <>
                <p className="mt-1 text-sm font-semibold text-emerald-700">Clocked in at {clockInTime}</p>
                <p className="font-mono text-xl font-black text-emerald-600">{elapsed}</p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-700">You have not clocked in today.</p>
            )}
          </div>
          {clockedIn ? (
            <button
              onClick={handleClockOut}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition"
            >
              Clock Out
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
            >
              Clock In
            </button>
          )}
        </div>
        <Link href="/staff/attendance" className="mt-2 block text-xs font-semibold text-indigo-600 hover:underline">
          View attendance history →
        </Link>
      </div>

      {/* ── Next shift card ──────────────────────────────────────────────── */}
      {nextShift ? (
        <div className={`rounded-2xl border p-4 ${SHIFT_COLORS[nextShift.shiftType]}`}>
          <p className="text-xs font-bold uppercase tracking-wide opacity-60">
            {isOnShift ? "Today's Shift" : "Next Shift"}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">
                {isOnShift ? "Today" : formatDate(nextShift.shiftDate)}
              </p>
              <p className="text-sm opacity-80">
                {nextShift.shiftStart} – {nextShift.shiftEnd} · {nextShift.unit}
              </p>
            </div>
            <div className="text-right">
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${SHIFT_COLORS[nextShift.shiftType]}`}>
                {nextShift.shiftType.replace("_", " ")}
              </span>
              {upcoming.length > 1 && (
                <p className="mt-1 text-[10px] opacity-60">+{upcoming.length - 1} more shifts</p>
              )}
            </div>
          </div>
          <Link href="/staff/my-rota" className="mt-2 block text-xs font-semibold text-indigo-700 hover:underline">
            View full rota →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
          No upcoming shifts scheduled.
          <Link href="/staff/my-rota" className="ml-1 font-semibold text-indigo-600 hover:underline">View rota →</Link>
        </div>
      )}

      {/* ── Summary stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
          <p className="text-xl font-black text-indigo-700">{upcoming.length}</p>
          <p className="text-[10px] font-semibold text-slate-400">Upcoming Shifts</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
          <p className="text-xl font-black text-emerald-700">{annualLeft}</p>
          <p className="text-[10px] font-semibold text-slate-400">Leave Days Left</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center">
          <p className={`text-xl font-black ${notifs.length > 0 ? "text-red-600" : "text-slate-400"}`}>{notifs.length}</p>
          <p className="text-[10px] font-semibold text-slate-400">New Notifications</p>
        </div>
      </div>

      {/* ── Notifications preview ─────────────────────────────────────────── */}
      {notifs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">New Alerts</p>
            <Link href="/staff/notifications" className="text-xs font-semibold text-indigo-600 hover:underline">See all</Link>
          </div>
          <div className="space-y-2">
            {notifs.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="mt-0.5 text-base">🔔</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick access tiles ────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Access</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`rounded-2xl border px-4 py-4 transition hover:shadow-sm ${tile.color}`}
            >
              <p className="text-2xl">{tile.icon}</p>
              <p className="mt-2 font-bold text-slate-900">{tile.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{tile.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Leave snapshot ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Leave Balance 2026</p>
          <Link href="/staff/leave" className="text-xs font-semibold text-indigo-600 hover:underline">Apply →</Link>
        </div>
        {[
          { type: "Annual", daysUsed: leaveBalance.annual.daysUsed, daysTotal: leaveBalance.annual.daysTotal },
          { type: "Sick", daysUsed: leaveBalance.sick.daysUsed, daysTotal: leaveBalance.sick.daysTotal },
        ].map((l) => (
          <div key={l.type} className="mb-2 last:mb-0">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-semibold text-slate-700">{l.type} Leave</span>
              <span className="text-slate-500">{l.daysUsed} / {l.daysTotal} days used</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${l.type === "Annual" ? "bg-indigo-500" : "bg-amber-500"}`}
                style={{ width: `${(l.daysUsed / l.daysTotal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
