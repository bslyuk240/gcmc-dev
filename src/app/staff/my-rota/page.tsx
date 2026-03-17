"use client";

import { useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_COLORS: Record<string, string> = {
  morning:   "bg-amber-100  text-amber-800  border-amber-200",
  afternoon: "bg-sky-100    text-sky-800    border-sky-200",
  evening:   "bg-violet-100 text-violet-800 border-violet-200",
  night:     "bg-slate-100  text-slate-700  border-slate-200",
  on_call:   "bg-red-100    text-red-800    border-red-200",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-emerald-600 font-semibold",
  scheduled: "text-amber-600",
  swapped:   "text-violet-600",
  cancelled: "text-slate-400 line-through",
  completed: "text-slate-400",
};

type Shift = {
  id: string;
  shift_date: string;
  shift_type: keyof typeof SHIFT_COLORS;
  shift_start: string;
  shift_end: string;
  unit: string;
  status: string;
};

const ALL_SHIFTS: Shift[] = [
  { id: "s1",  shift_date: "2026-03-16", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "ICU",        status: "confirmed" },
  { id: "s2",  shift_date: "2026-03-17", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "ICU",        status: "confirmed" },
  { id: "s3",  shift_date: "2026-03-19", shift_type: "afternoon", shift_start: "14:00", shift_end: "21:00", unit: "Ward A",     status: "confirmed" },
  { id: "s4",  shift_date: "2026-03-20", shift_type: "night",     shift_start: "21:00", shift_end: "07:00", unit: "Emergency",  status: "scheduled" },
  { id: "s5",  shift_date: "2026-03-22", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "Outpatient", status: "confirmed" },
  { id: "s6",  shift_date: "2026-03-24", shift_type: "afternoon", shift_start: "14:00", shift_end: "21:00", unit: "Ward A",     status: "confirmed" },
  { id: "s7",  shift_date: "2026-03-26", shift_type: "evening",   shift_start: "17:00", shift_end: "23:00", unit: "ICU",        status: "confirmed" },
  { id: "s8",  shift_date: "2026-03-28", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "Ward A",     status: "scheduled" },
  { id: "s9",  shift_date: "2026-04-01", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "ICU",        status: "scheduled" },
  { id: "s10", shift_date: "2026-04-03", shift_type: "on_call",   shift_start: "00:00", shift_end: "08:00", unit: "Emergency",  status: "scheduled" },
  { id: "s11", shift_date: "2026-04-05", shift_type: "afternoon", shift_start: "14:00", shift_end: "21:00", unit: "Outpatient", status: "scheduled" },
  { id: "s12", shift_date: "2026-04-07", shift_type: "morning",   shift_start: "07:00", shift_end: "14:00", unit: "Ward A",     status: "scheduled" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function addDays(iso: string, n: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function getWeekMonday(iso: string): string {
  const d   = new Date(iso);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function shiftHours(s: Shift): number {
  const [sh, sm] = s.shift_start.split(":").map(Number);
  const [eh, em] = s.shift_end.split(":").map(Number);
  let h = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (h < 0) h += 24;
  return h;
}

function fmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-GB", opts);
}

// ─── Component ────────────────────────────────────────────────────────────────
type View = "week" | "month";

export default function MyRotaPage() {
  const session   = useHMSSession();
  const todayISO  = new Date().toISOString().slice(0, 10);

  const [view, setView]         = useState<View>("week");
  const [weekOf, setWeekOf]     = useState(todayISO);
  const [monthOf, setMonthOf]   = useState(todayISO.slice(0, 7));   // "2026-03"
  const [swapShift, setSwap]    = useState<Shift | null>(null);
  const [swapNote, setSwapNote] = useState("");
  const [swapSent, setSwapSent] = useState<Set<string>>(new Set());
  const [toast, setToast]       = useState<string | null>(null);

  const weekStart = getWeekMonday(weekOf);
  const weekDates = DAYS_SHORT.map((_, i) => addDays(weekStart, i));

  // Month calendar
  const [mYear, mMonth] = monthOf.split("-").map(Number);
  const firstDay = new Date(mYear, mMonth - 1, 1);
  const daysInMonth = new Date(mYear, mMonth, 0).getDate();
  const startPad = (firstDay.getDay() + 6) % 7; // Mon-aligned

  const weekLabel = `${fmt(weekStart, { day: "numeric", month: "long" })} – ${fmt(addDays(weekStart, 6), { day: "numeric", month: "long", year: "numeric" })}`;
  const monthLabel = new Date(mYear, mMonth - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const thisWeekShifts = ALL_SHIFTS.filter((s) => s.shift_date >= weekStart && s.shift_date <= addDays(weekStart, 6));
  const weekHours = thisWeekShifts.reduce((sum, s) => sum + shiftHours(s), 0);

  const monthShifts = ALL_SHIFTS.filter((s) => s.shift_date.startsWith(monthOf));
  const monthHours  = monthShifts.reduce((sum, s) => sum + shiftHours(s), 0);

  function submitSwap() {
    if (!swapShift) return;
    setSwapSent((prev) => new Set([...prev, swapShift.id]));
    setToast(`Swap request submitted for ${fmt(swapShift.shift_date, { day: "numeric", month: "short" })}.`);
    setSwap(null);
    setSwapNote("");
    setTimeout(() => setToast(null), 3500);
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Rota</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {session ? `${session.full_name} — ${session.department}` : "Your shift schedule"}
        </p>
      </div>

      {/* View toggle */}
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
        {(["week", "month"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
              view === v ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {v} View
          </button>
        ))}
      </div>

      {/* ── WEEK VIEW ─────────────────────────────────────────────────────── */}
      {view === "week" && (
        <>
          {/* Nav + stats */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOf(addDays(weekStart, -7))} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">← Prev</button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">{weekLabel}</p>
                <p className="text-xs text-slate-400">
                  {thisWeekShifts.length} shift{thisWeekShifts.length !== 1 ? "s" : ""} · {weekHours}h
                </p>
              </div>
              <button onClick={() => setWeekOf(addDays(weekStart,  7))} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Next →</button>
            </div>
          </div>

          {/* Day cards */}
          <div className="space-y-2">
            {weekDates.map((date, i) => {
              const dayShifts = ALL_SHIFTS.filter((s) => s.shift_date === date);
              const isToday   = date === todayISO;

              return (
                <div key={date} className={`rounded-xl border bg-white p-3.5 ${isToday ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${isToday ? "text-indigo-600" : "text-slate-400"}`}>{DAYS_SHORT[i]}</span>
                    <span className={`text-sm font-bold ${isToday ? "text-indigo-700" : "text-slate-700"}`}>
                      {fmt(date, { day: "numeric", month: "short" })}
                    </span>
                    {isToday && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">Today</span>}
                    {dayShifts.length === 0 && <span className="ml-auto text-xs text-slate-300">Day off</span>}
                  </div>
                  {dayShifts.map((s) => (
                    <div key={s.id} className={`mt-1.5 flex items-center justify-between rounded-lg border px-3 py-2 ${SHIFT_COLORS[s.shift_type]}`}>
                      <div>
                        <p className={`text-xs font-bold capitalize ${STATUS_STYLES[s.status]}`}>
                          {s.shift_type.replace("_", " ")} · {s.unit}
                        </p>
                        <p className="text-[11px] opacity-70">{s.shift_start} – {s.shift_end} ({shiftHours(s)}h)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] capitalize ${STATUS_STYLES[s.status]}`}>{s.status}</span>
                        {s.status !== "completed" && s.status !== "cancelled" && !swapSent.has(s.id) && (
                          <button
                            onClick={() => setSwap(s)}
                            className="rounded-lg border border-current/20 bg-white/50 px-2 py-0.5 text-[10px] font-bold hover:bg-white/80 transition"
                          >
                            Swap
                          </button>
                        )}
                        {swapSent.has(s.id) && (
                          <span className="text-[10px] font-bold text-violet-600">Swap requested</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── MONTH VIEW ────────────────────────────────────────────────────── */}
      {view === "month" && (
        <>
          {/* Nav + stats */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const d = new Date(mYear, mMonth - 2, 1);
                  setMonthOf(d.toISOString().slice(0, 7));
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                ← Prev
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">{monthLabel}</p>
                <p className="text-xs text-slate-400">
                  {monthShifts.length} shift{monthShifts.length !== 1 ? "s" : ""} · {monthHours}h
                </p>
              </div>
              <button
                onClick={() => {
                  const d = new Date(mYear, mMonth, 1);
                  setMonthOf(d.toISOString().slice(0, 7));
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400">{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {Array.from({ length: startPad }, (_, i) => (
                <div key={`pad-${i}`} className="min-h-[52px] border-b border-r border-slate-50" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day     = i + 1;
                const dateStr = `${monthOf}-${String(day).padStart(2, "0")}`;
                const shifts  = ALL_SHIFTS.filter((s) => s.shift_date === dateStr);
                const isToday = dateStr === todayISO;

                return (
                  <div
                    key={day}
                    className={`min-h-[52px] border-b border-r border-slate-100 p-1 ${isToday ? "bg-indigo-50" : ""}`}
                  >
                    <p className={`mb-0.5 text-right text-[11px] font-bold ${isToday ? "text-indigo-600" : "text-slate-500"}`}>
                      {day}
                    </p>
                    {shifts.slice(0, 1).map((s) => (
                      <div key={s.id} className={`rounded px-1 py-0.5 text-[9px] font-bold truncate capitalize ${SHIFT_COLORS[s.shift_type]}`}>
                        {s.shift_type.replace("_", " ")}
                      </div>
                    ))}
                    {shifts.length > 1 && (
                      <p className="text-[8px] text-slate-400">+{shifts.length - 1}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month shift list */}
          {monthShifts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">All Shifts This Month</p>
              {monthShifts.map((s) => (
                <div key={s.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${SHIFT_COLORS[s.shift_type]}`}>
                  <div>
                    <p className={`text-sm font-bold capitalize ${STATUS_STYLES[s.status]}`}>
                      {fmt(s.shift_date, { weekday: "short", day: "numeric", month: "short" })} · {s.unit}
                    </p>
                    <p className="text-xs opacity-70">{s.shift_type.replace("_", " ")} · {s.shift_start}–{s.shift_end}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{shiftHours(s)}h</span>
                    {s.status !== "completed" && s.status !== "cancelled" && !swapSent.has(s.id) && (
                      <button
                        onClick={() => setSwap(s)}
                        className="rounded-lg bg-white/60 border border-current/20 px-2 py-0.5 text-[10px] font-bold hover:bg-white/90"
                      >
                        Swap
                      </button>
                    )}
                    {swapSent.has(s.id) && (
                      <span className="text-[10px] font-bold text-violet-700">Swap sent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Shift swap modal ──────────────────────────────────────────────── */}
      {swapShift && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div>
              <h3 className="font-black text-slate-900">Request Shift Swap</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {fmt(swapShift.shift_date, { weekday: "long", day: "numeric", month: "long" })} · {swapShift.shift_start}–{swapShift.shift_end} · {swapShift.unit}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Reason / Note for HR</label>
              <textarea
                rows={3}
                value={swapNote}
                onChange={(e) => setSwapNote(e.target.value)}
                placeholder="Explain why you need a swap…"
                className={inputCls}
              />
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Your HOD and HR will be notified. Approval is not guaranteed.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSwap(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button onClick={submitSwap} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 inset-x-4 mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl z-50">
          {toast}
        </div>
      )}

      <p className="text-center text-xs text-slate-300">
        Contact your HOD or HR to request amendments.
      </p>
    </div>
  );
}
