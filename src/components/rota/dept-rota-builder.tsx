"use client";

import { useCallback, useEffect, useState } from "react";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import {
  fetchShiftsForDept,
  createDeptShift,
  deleteNcShift,
  type NcShift,
} from "@/lib/supabase/db";
import { cn } from "@/lib/utils/cn";

const SHIFT_TYPES: Array<{
  value: NcShift["shiftType"];
  label: string;
  short: string;
  time: string;
  color: string;
  bg: string;
}> = [
  { value: "morning",   label: "Morning",   short: "MOR", time: "07:00 – 15:00", color: "text-amber-700",  bg: "bg-amber-100"  },
  { value: "afternoon", label: "Afternoon", short: "AFT", time: "15:00 – 23:00", color: "text-sky-700",    bg: "bg-sky-100"    },
  { value: "night",     label: "Night",     short: "NGT", time: "23:00 – 07:00", color: "text-indigo-700", bg: "bg-indigo-100" },
  { value: "on_call",   label: "On Call",   short: "ONC", time: "Flexible",      color: "text-rose-700",   bg: "bg-rose-100"   },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function toISO(date: Date): string { return date.toISOString().slice(0, 10); }
function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

type ShiftCell = { staffId: string; date: string };

export function DeptRotaBuilder({
  department,
  deptDisplayName,
}: {
  department: string;       // DB key: "pharmacy"
  deptDisplayName: string;  // HR display: "Pharmacy"
}) {
  const { staff } = useHRStore();

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [shifts, setShifts]       = useState<NcShift[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [cell, setCell]           = useState<ShiftCell | null>(null);
  const [pickedType, setPickedType] = useState<NcShift["shiftType"]>("morning");
  const [confirmDelete, setConfirmDelete] = useState<NcShift | null>(null);

  const deptStaff = staff.filter(
    (s) => s.department === deptDisplayName && s.status === "Active",
  );

  const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));
  const weekEnd   = weekDates[6];

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchShiftsForDept(department, weekDates[0], weekEnd);
      setShifts(data);
    } finally {
      setLoading(false);
    }
  }, [department, weekDates[0], weekEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadShifts(); }, [loadShifts]);

  function getShift(staffId: string, date: string): NcShift | undefined {
    return shifts.find((s) => s.staffId === staffId && s.shiftDate === date);
  }
  function shiftStyle(type: NcShift["shiftType"]) {
    return SHIFT_TYPES.find((t) => t.value === type) ?? SHIFT_TYPES[0];
  }

  async function handleAssign() {
    if (!cell) return;
    setSaving(true);
    try {
      const existing = getShift(cell.staffId, cell.date);
      if (existing) {
        await deleteNcShift(existing.id);
        setShifts((prev) => prev.filter((s) => s.id !== existing.id));
      }
      const created = await createDeptShift({
        staffId:   cell.staffId,
        department,
        shiftDate: cell.date,
        shiftType: pickedType,
      });
      if (created) setShifts((prev) => [...prev, created]);
    } finally {
      setSaving(false);
      setCell(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    await deleteNcShift(confirmDelete.id);
    setShifts((prev) => prev.filter((s) => s.id !== confirmDelete.id));
    setSaving(false);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button type="button" onClick={() => setWeekStart((d) => addDays(d, -7))}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev week
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900">Week of {formatWeekRange(weekStart)}</p>
          <p className="text-xs text-slate-400">{deptDisplayName} Department</p>
        </div>
        <button type="button" onClick={() => setWeekStart((d) => addDays(d, 7))}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          Next week
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {SHIFT_TYPES.map((t) => (
          <span key={t.value} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", t.bg, t.color)}>
            {t.short} · {t.label} ({t.time})
          </span>
        ))}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
          — · Off / Click to assign
        </span>
      </div>

      {/* Rota grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : (
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 min-w-[160px]">
                  Staff
                </th>
                {weekDates.map((date, i) => {
                  const isToday = date === toISO(new Date());
                  return (
                    <th key={date} className={cn("min-w-[88px] px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide", isToday ? "text-[var(--accent)]" : "text-slate-500")}>
                      <span className="block">{DAY_LABELS[i]}</span>
                      <span className={cn("block text-base font-bold", isToday ? "text-[var(--accent)]" : "text-slate-700")}>
                        {formatHeaderDate(addDays(weekStart, i))}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    No active staff in <strong>{deptDisplayName}</strong> yet.
                    Assign staff to this department from HR Onboarding.
                  </td>
                </tr>
              ) : (
                deptStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {getInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{s.name}</p>
                          <p className="truncate text-[10px] text-slate-400">{s.role}</p>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((date) => {
                      const shift = getShift(s.id, date);
                      const style = shift ? shiftStyle(shift.shiftType) : null;
                      const isToday = date === toISO(new Date());
                      return (
                        <td key={date} className={cn("px-2 py-2 text-center", isToday && "bg-[var(--accent)]/5")}>
                          {shift && style ? (
                            <button type="button"
                              title={`${style.label} (${style.time}) — click to reassign, right-click to remove`}
                              onClick={() => { setCell({ staffId: s.id, date }); setPickedType(shift.shiftType); }}
                              onContextMenu={(e) => { e.preventDefault(); setConfirmDelete(shift); }}
                              className={cn("inline-flex flex-col items-center rounded-lg px-2 py-1 text-[11px] font-bold transition hover:opacity-80", style.bg, style.color)}>
                              <span>{style.short}</span>
                              <span className="text-[9px] font-normal opacity-70">{style.time}</span>
                            </button>
                          ) : (
                            <button type="button" title="Click to assign shift"
                              onClick={() => { setCell({ staffId: s.id, date }); setPickedType("morning"); }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-slate-200 text-slate-300 transition hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2.5" strokeLinecap="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Click a cell to assign or change a shift · Right-click a shift badge to remove it
      </p>

      {/* Assign Shift Modal */}
      {cell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="font-bold text-slate-900">
                {staff.find((s) => s.id === cell.staffId)?.name ?? "Staff"}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(cell.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shift Type</p>
              {SHIFT_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setPickedType(t.value)}
                  className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                    pickedType === t.value ? `border-[var(--accent)]/40 ${t.bg}` : "border-slate-200 hover:bg-slate-50")}>
                  <div>
                    <span className={cn("text-sm font-semibold", pickedType === t.value ? t.color : "text-slate-700")}>{t.label}</span>
                    <span className="ml-2 text-xs text-slate-400">{t.time}</span>
                  </div>
                  {pickedType === t.value && (
                    <svg className="h-4 w-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setCell(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void handleAssign()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
                {saving ? "Saving…" : "Assign Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Shift Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 py-5">
              <h3 className="font-bold text-slate-900">Remove shift?</h3>
              <p className="mt-1 text-sm text-slate-500">
                This will remove the <strong>{shiftStyle(confirmDelete.shiftType).label}</strong> shift on{" "}
                <strong>{new Date(confirmDelete.shiftDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" disabled={saving} onClick={() => void handleDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
                {saving ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
