"use client";

import { useCallback, useEffect, useState } from "react";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { pushNotification, type DeptKey } from "@/lib/data/notification-store";
import {
  fetchShiftsForDept,
  createDeptShift,
  deleteNcShift,
  fetchShiftPresets,
  addShiftPreset,
  deleteShiftPreset,
  type NcShift,
  type ShiftPreset,
} from "@/lib/supabase/db";
import type { RotaSwapRequest } from "@/modules/workforce/rota/types";
import { cn } from "@/lib/utils/cn";

// Fallback hardcoded types — used when no presets loaded yet
const FALLBACK_TYPES: Array<{
  value: NcShift["shiftType"];
  label: string;
  short: string;
  color: string;
  bg: string;
}> = [
  { value: "morning",   label: "Morning",   short: "MOR", color: "text-amber-700",  bg: "bg-amber-100"  },
  { value: "afternoon", label: "Afternoon", short: "AFT", color: "text-sky-700",    bg: "bg-sky-100"    },
  { value: "night",     label: "Night",     short: "NGT", color: "text-indigo-700", bg: "bg-indigo-100" },
  { value: "on_call",   label: "On Call",   short: "ONC", color: "text-rose-700",   bg: "bg-rose-100"   },
];

const COLOR_MAP: Record<string, { color: string; bg: string; short: string }> = {
  amber:  { color: "text-amber-700",   bg: "bg-amber-100",   short: "MOR" },
  sky:    { color: "text-sky-700",     bg: "bg-sky-100",     short: "AFT" },
  indigo: { color: "text-indigo-700",  bg: "bg-indigo-100",  short: "NGT" },
  rose:   { color: "text-rose-700",    bg: "bg-rose-100",    short: "ONC" },
  teal:   { color: "text-teal-700",    bg: "bg-teal-100",    short: "SHF" },
  violet: { color: "text-violet-700",  bg: "bg-violet-100",  short: "SHF" },
  green:  { color: "text-green-700",   bg: "bg-green-100",   short: "SHF" },
  orange: { color: "text-orange-700",  bg: "bg-orange-100",  short: "SHF" },
};

const SHIFT_TYPE_TO_COLOR: Record<NcShift["shiftType"], string> = {
  morning: "amber", afternoon: "sky", night: "indigo", on_call: "rose",
};

const REQUEST_STATUS_STYLES: Record<RotaSwapRequest["status"], string> = {
  pending: "text-amber-700",
  approved: "text-emerald-700",
  rejected: "text-rose-700",
  cancelled: "text-slate-500",
};

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

function getRequestLabel(status: RotaSwapRequest["status"]): string {
  return status === "pending" ? "Pending review" : status.charAt(0).toUpperCase() + status.slice(1);
}

type ShiftCell = { staffId: string; date: string };

export function DeptRotaBuilder({
  department,
  deptDisplayName,
}: {
  department: string;
  deptDisplayName: string;
}) {
  const { staff } = useHRStore();

  const [weekStart, setWeekStart]     = useState<Date>(() => getMondayOf(new Date()));
  const [shifts, setShifts]           = useState<NcShift[]>([]);
  const [swapRequests, setSwapRequests] = useState<RotaSwapRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [swapLoading, setSwapLoading] = useState(true);
  const [saving, setSaving]           = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NcShift | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Presets
  const [presets, setPresets]         = useState<ShiftPreset[]>([]);
  const [activeBrush, setActiveBrush] = useState<ShiftPreset | null>(null); // null = modal mode, "clear" handled separately
  const [brushIsErase, setBrushIsErase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Cell modal (used when no brush active)
  const [cell, setCell]               = useState<ShiftCell | null>(null);
  const [pickedType, setPickedType]   = useState<NcShift["shiftType"]>("morning");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  // Preset settings form
  const [newPresetName, setNewPresetName]   = useState("");
  const [newPresetStart, setNewPresetStart] = useState("07:00");
  const [newPresetEnd, setNewPresetEnd]     = useState("15:00");
  const [newPresetType, setNewPresetType]   = useState<NcShift["shiftType"]>("morning");
  const [addingPreset, setAddingPreset]     = useState(false);

  const deptStaff = staff.filter(
    (s) => s.department === deptDisplayName && s.status === "Active",
  );
  const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));

  const loadShifts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchShiftsForDept(department, weekDates[0], weekDates[6]);
      setShifts(data);
    } finally {
      setLoading(false);
    }
  }, [department, weekDates[0], weekDates[6]]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPresets = useCallback(async () => {
    const data = await fetchShiftPresets(department);
    setPresets(data);
  }, [department]);

  const loadSwapRequests = useCallback(async () => {
    setSwapLoading(true);
    setRequestError(null);
    try {
      const response = await fetch(`/api/rota-requests?department=${encodeURIComponent(department)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load swap requests.");
      }
      setSwapRequests(Array.isArray(payload?.requests) ? (payload.requests as RotaSwapRequest[]) : []);
    } catch (error) {
      setSwapRequests([]);
      setRequestError(error instanceof Error ? error.message : "Failed to load swap requests.");
    } finally {
      setSwapLoading(false);
    }
  }, [department]);

  useEffect(() => { void loadShifts(); }, [loadShifts]);
  useEffect(() => { void loadPresets(); }, [loadPresets]);
  useEffect(() => { void loadSwapRequests(); }, [loadSwapRequests]);

  function getShift(staffId: string, date: string): NcShift | undefined {
    return shifts.find((s) => s.staffId === staffId && s.shiftDate === date);
  }

  function presetStyle(preset: ShiftPreset) {
    const cm = COLOR_MAP[preset.colorKey] ?? COLOR_MAP.amber;
    return { color: cm.color, bg: cm.bg };
  }

  function shiftLabel(shift: NcShift) {
    // Try to find the matching preset by start/end time or shiftType
    const match = presets.find((p) => p.startTime === shift.shiftStart && p.endTime === shift.shiftEnd);
    if (match) return { name: match.name, start: match.startTime, end: match.endTime, ...presetStyle(match) };
    // Fallback to built-in type
    const fb = FALLBACK_TYPES.find((t) => t.value === shift.shiftType) ?? FALLBACK_TYPES[0];
    const defColor = COLOR_MAP[SHIFT_TYPE_TO_COLOR[shift.shiftType]] ?? COLOR_MAP.amber;
    return { name: fb.label, start: shift.shiftStart, end: shift.shiftEnd, color: defColor.color, bg: defColor.bg };
  }

  // ── CELL CLICK: brush paint mode ──────────────────────────────────────────
  async function handleCellClick(staffId: string, date: string) {
    if (brushIsErase) {
      const existing = getShift(staffId, date);
      if (!existing) return;
      setSaving(true);
      await deleteNcShift(existing.id);
      setShifts((prev) => prev.filter((s) => s.id !== existing.id));
      setSaving(false);
      return;
    }
    if (activeBrush) {
      setSaving(true);
      try {
        const existing = getShift(staffId, date);
        if (existing) {
          await deleteNcShift(existing.id);
          setShifts((prev) => prev.filter((s) => s.id !== existing.id));
        }
        const created = await createDeptShift({
          staffId, department,
          shiftDate: date,
          shiftType: activeBrush.shiftType,
          customStart: activeBrush.startTime,
          customEnd: activeBrush.endTime,
        });
        if (created) setShifts((prev) => [...prev, created]);
      } finally {
        setSaving(false);
      }
      return;
    }
    // No brush → open modal
    const existing = getShift(staffId, date);
    setPickedType(existing?.shiftType ?? "morning");
    const fb = FALLBACK_TYPES.find((t) => t.value === (existing?.shiftType ?? "morning")) ?? FALLBACK_TYPES[0];
    const defColor = COLOR_MAP[SHIFT_TYPE_TO_COLOR[existing?.shiftType ?? "morning"]] ?? COLOR_MAP.amber;
    void fb; void defColor; // suppress unused
    setCustomStart(existing?.shiftStart ?? "07:00");
    setCustomEnd(existing?.shiftEnd ?? "15:00");
    setCell({ staffId, date });
  }

  // ── MODAL ASSIGN ──────────────────────────────────────────────────────────
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
        staffId: cell.staffId,
        department,
        shiftDate: cell.date,
        shiftType: pickedType,
        customStart,
        customEnd,
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

  async function handleAddPreset() {
    if (!newPresetName.trim()) return;
    setAddingPreset(true);
    const result = await addShiftPreset({
      department,
      name: newPresetName.trim(),
      startTime: newPresetStart,
      endTime: newPresetEnd,
      shiftType: newPresetType,
      colorKey: SHIFT_TYPE_TO_COLOR[newPresetType],
    });
    if (result) setPresets((prev) => [...prev, result]);
    setNewPresetName(""); setNewPresetStart("07:00"); setNewPresetEnd("15:00"); setNewPresetType("morning");
    setAddingPreset(false);
  }

  async function handleDeletePreset(id: string) {
    await deleteShiftPreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (activeBrush?.id === id) setActiveBrush(null);
  }

  async function handleReviewSwapRequest(requestId: string, status: "approved" | "rejected") {
    setReviewingId(requestId);
    try {
      const response = await fetch("/api/rota-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to review swap request.");
      }

      const reviewed = payload?.request as RotaSwapRequest | undefined;
      if (reviewed) {
        setSwapRequests((prev) => prev.map((item) => (item.id === reviewed.id ? reviewed : item)));
        pushNotification({
          category: "hr",
          severity: status === "approved" ? "success" : "warning",
          title: `Shift swap ${status}`,
          body: `${reviewed.staffName}'s ${reviewed.shiftDate} ${reviewed.shiftType.replace("_", " ")} request was ${status}.`,
          href: `/app/${department}/rota`,
          targetDepartments: [department as DeptKey, "hr", "admin"],
        });
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Failed to review swap request.");
    } finally {
      setReviewingId(null);
    }
  }

  // When picking a preset type in modal, update default times
  function handlePickType(type: NcShift["shiftType"]) {
    setPickedType(type);
    const preset = presets.find((p) => p.shiftType === type);
    if (preset) { setCustomStart(preset.startTime); setCustomEnd(preset.endTime); }
    else {
      const defaults: Record<string, [string, string]> = {
        morning: ["07:00", "15:00"], afternoon: ["15:00", "23:00"],
        night: ["23:00", "07:00"], on_call: ["00:00", "23:59"],
      };
      const [s, e] = defaults[type] ?? ["07:00", "15:00"];
      setCustomStart(s); setCustomEnd(e);
    }
  }

  const allPresets = presets.length > 0 ? presets : FALLBACK_TYPES.map((t) => ({
    id: t.value,
    department,
    name: t.label,
    startTime: "07:00",
    endTime: "15:00",
    shiftType: t.value,
    colorKey: SHIFT_TYPE_TO_COLOR[t.value],
    createdAt: "",
  } as ShiftPreset));

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
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSettings(true)}
            title="Shift preset settings"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeWidth="1.8" strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button type="button" onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Next week
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preset Palette (brush toolbar) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mr-1">Brush:</span>
        {allPresets.map((p) => {
          const style = presetStyle(p);
          const isActive = activeBrush?.id === p.id && !brushIsErase;
          return (
            <button key={p.id} type="button"
              onClick={() => { setActiveBrush(isActive ? null : p); setBrushIsErase(false); }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition border",
                isActive
                  ? cn("ring-2 ring-[var(--accent)] ring-offset-1", style.bg, style.color, "border-transparent")
                  : cn("bg-white text-slate-600 border-slate-200 hover:border-slate-300", "hover:" + style.bg),
              )}>
              <span>{p.name}</span>
              <span className="opacity-60">{p.startTime}–{p.endTime}</span>
            </button>
          );
        })}
        <button type="button"
          onClick={() => { setBrushIsErase(!brushIsErase); setActiveBrush(null); }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition",
            brushIsErase
              ? "bg-red-50 text-red-700 border-red-200 ring-2 ring-red-400 ring-offset-1"
              : "bg-white text-slate-500 border-slate-200 hover:border-red-200 hover:text-red-600",
          )}>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Erase
        </button>
        {(activeBrush || brushIsErase) && (
          <button type="button" onClick={() => { setActiveBrush(null); setBrushIsErase(false); }}
            className="ml-1 text-xs text-slate-400 underline hover:text-slate-600">
            Deselect
          </button>
        )}
        {(activeBrush || brushIsErase) && (
          <span className="text-xs text-[var(--accent)] font-medium ml-auto">
            {brushIsErase ? "Click cells to erase" : `Painting: ${activeBrush?.name} — click cells to apply`}
          </span>
        )}
      </div>

      {/* Rota grid */}
      <div className={cn("overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm", (activeBrush || brushIsErase) && "ring-2 ring-[var(--accent)]/30")}>
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
                      const lbl = shift ? shiftLabel(shift) : null;
                      const isToday = date === toISO(new Date());
                      const isPaintMode = activeBrush || brushIsErase;
                      return (
                        <td key={date} className={cn("px-2 py-2 text-center", isToday && "bg-[var(--accent)]/5")}>
                          {shift && lbl ? (
                            <button type="button"
                              title={isPaintMode ? "Click to paint" : `${lbl.name} (${lbl.start}–${lbl.end}) — click to reassign, right-click to remove`}
                              onClick={() => void handleCellClick(s.id, date)}
                              onContextMenu={(e) => { if (!isPaintMode) { e.preventDefault(); setConfirmDelete(shift); } }}
                              className={cn("inline-flex flex-col items-center rounded-lg px-2 py-1 text-[11px] font-bold transition",
                                lbl.bg, lbl.color,
                                isPaintMode ? "hover:opacity-70 cursor-crosshair" : "hover:opacity-80",
                              )}>
                              <span className="truncate max-w-[72px]">{lbl.name}</span>
                              <span className="text-[9px] font-normal opacity-70">{lbl.start}–{lbl.end}</span>
                            </button>
                          ) : (
                            <button type="button"
                              title={isPaintMode ? (brushIsErase ? "Nothing to erase" : "Click to apply") : "Click to assign shift"}
                              onClick={() => void handleCellClick(s.id, date)}
                              className={cn(
                                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashed transition",
                                isPaintMode && !brushIsErase
                                  ? "border-[var(--accent)]/50 bg-[var(--accent)]/5 text-[var(--accent)] cursor-crosshair hover:bg-[var(--accent)]/10"
                                  : "border-slate-200 text-slate-300 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 hover:text-[var(--accent)]",
                              )}>
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Swap Requests</h3>
            <p className="text-xs text-slate-500">Review staff requests against the rota builder.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            {swapRequests.filter((request) => request.status === "pending").length} pending
          </span>
        </div>

        {requestError ? (
          <div className="px-4 py-3 text-sm text-rose-700">{requestError}</div>
        ) : swapLoading ? (
          <div className="px-4 py-5 text-sm text-slate-500">Loading swap requests...</div>
        ) : swapRequests.length === 0 ? (
          <div className="px-4 py-5 text-sm text-slate-400">No swap requests yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {swapRequests.map((request) => {
              const pending = request.status === "pending";
              return (
                <div key={request.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{request.staffName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${REQUEST_STATUS_STYLES[request.status] ?? "text-slate-500"}`}>
                        {getRequestLabel(request.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(request.shiftDate + "T00:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })} · {request.shiftType.replace("_", " ")} · {request.shiftStart ?? "00:00"}-{request.shiftEnd ?? "00:00"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {request.reason ?? "No reason provided"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {request.unitName ?? request.department}
                    </span>
                    {pending ? (
                      <>
                        <button
                          type="button"
                          disabled={reviewingId === request.id}
                          onClick={() => void handleReviewSwapRequest(request.id, "approved")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingId === request.id}
                          onClick={() => void handleReviewSwapRequest(request.id, "rejected")}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Reviewed {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString("en-GB") : "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        {activeBrush ? `Brush active: ${activeBrush.name} — click cells to paint. Click "Deselect" to go back to modal mode.`
          : brushIsErase ? "Erase mode — click a shift cell to remove it."
          : "Select a brush above to paint quickly, or click any cell to assign a shift with custom times. Right-click a shift to remove."}
      </p>

      {/* ── Assign Shift Modal (no brush mode) ── */}
      {cell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="font-bold text-slate-900">
                {staff.find((s) => s.id === cell.staffId)?.name ?? "Staff"}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(cell.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Shift Type</p>
              {(["morning", "afternoon", "night", "on_call"] as NcShift["shiftType"][]).map((type) => {
                const preset = presets.find((p) => p.shiftType === type);
                const fb = FALLBACK_TYPES.find((t) => t.value === type) ?? FALLBACK_TYPES[0];
                const cm = COLOR_MAP[SHIFT_TYPE_TO_COLOR[type]] ?? COLOR_MAP.amber;
                const label = preset?.name ?? fb.label;
                return (
                  <button key={type} type="button" onClick={() => handlePickType(type)}
                    className={cn("flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                      pickedType === type ? `border-[var(--accent)]/40 ${cm.bg}` : "border-slate-200 hover:bg-slate-50")}>
                    <span className={cn("text-sm font-semibold", pickedType === type ? cm.color : "text-slate-700")}>{label}</span>
                    {pickedType === type && (
                      <svg className="h-4 w-4 text-[var(--accent)]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {/* Custom time override */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
                  <input type="time" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">End Time</label>
                  <input type="time" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Edit start/end to set irregular hours for this specific shift.</p>
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

      {/* ── Remove Confirm ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="px-5 py-5">
              <h3 className="font-bold text-slate-900">Remove shift?</h3>
              <p className="mt-1 text-sm text-slate-500">
                This will remove the shift on{" "}
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

      {/* ── Preset Settings Panel ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 sm:items-start sm:pt-16">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Shift Presets</h3>
                <p className="text-xs text-slate-400">Configure reusable shift templates for {deptDisplayName}</p>
              </div>
              <button type="button" onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {presets.length === 0 ? (
                <p className="text-sm text-slate-400">No custom presets yet. Add your first one below.</p>
              ) : (
                presets.map((p) => {
                  const style = presetStyle(p);
                  return (
                    <div key={p.id} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5", style.bg, "border-transparent")}>
                      <div>
                        <p className={cn("text-sm font-semibold", style.color)}>{p.name}</p>
                        <p className="text-xs text-slate-500">{p.startTime} – {p.endTime}</p>
                      </div>
                      <button type="button" onClick={() => void handleDeletePreset(p.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeWidth="2" strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add preset form */}
            <div className="border-t border-slate-100 px-5 py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add New Preset</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset name (e.g. Early Morning)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Start</label>
                  <input type="time" value={newPresetStart} onChange={(e) => setNewPresetStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">End</label>
                  <input type="time" value={newPresetEnd} onChange={(e) => setNewPresetEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Type (sets colour)</label>
                  <select value={newPresetType} onChange={(e) => setNewPresetType(e.target.value as NcShift["shiftType"])}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none">
                    <option value="morning">Morning (amber)</option>
                    <option value="afternoon">Afternoon (sky blue)</option>
                    <option value="night">Night (indigo)</option>
                    <option value="on_call">On Call (rose)</option>
                  </select>
                </div>
              </div>
              <button type="button" disabled={!newPresetName.trim() || addingPreset}
                onClick={() => void handleAddPreset()}
                className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40">
                {addingPreset ? "Adding…" : "Add Preset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
