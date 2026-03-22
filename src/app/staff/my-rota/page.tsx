"use client";

import { useEffect, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { pushNotification } from "@/lib/data/notification-store";
import type { RotaAssignment, RotaSwapRequest } from "@/modules/workforce/rota/types";

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-amber-100 text-amber-800 border-amber-200",
  afternoon: "bg-sky-100 text-sky-800 border-sky-200",
  evening: "bg-violet-100 text-violet-800 border-violet-200",
  night: "bg-slate-100 text-slate-700 border-slate-200",
  on_call: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-emerald-600 font-semibold",
  scheduled: "text-amber-600",
  swapped: "text-violet-600",
  cancelled: "text-slate-400 line-through",
  completed: "text-slate-400",
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "text-amber-700",
  approved: "text-emerald-700",
  rejected: "text-rose-700",
  cancelled: "text-slate-500",
};

type View = "week" | "month";
type Shift = RotaAssignment;

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekMonday(iso: string): string {
  const date = new Date(iso);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

function shiftHours(shift: Shift): number {
  const [startHour, startMinute] = (shift.shift_start ?? "00:00").split(":").map(Number);
  const [endHour, endMinute] = (shift.shift_end ?? "00:00").split(":").map(Number);
  let hours = (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
  if (hours < 0) hours += 24;
  return hours;
}

function fmt(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("en-GB", options);
}

function getMonthBounds(monthOf: string) {
  const [year, month] = monthOf.split("-").map(Number);
  return {
    start: `${monthOf}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function getShiftUnitLabel(shift: Shift): string {
  return shift.unit?.name ?? shift.unit?.description ?? shift.unit_id ?? "Unassigned";
}

function getShiftLabel(shift: Shift): string {
  return shift.shift_type.replace("_", " ");
}

function getRequestLabel(status: RotaSwapRequest["status"]): string {
  return status === "pending" ? "Pending review" : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MyRotaPage() {
  const session = useHMSSession();
  const todayISO = new Date().toISOString().slice(0, 10);

  const [view, setView] = useState<View>("week");
  const [weekOf, setWeekOf] = useState(todayISO);
  const [monthOf, setMonthOf] = useState(todayISO.slice(0, 7));
  const [rotaItems, setRotaItems] = useState<Shift[]>([]);
  const [rotaLoading, setRotaLoading] = useState(false);
  const [rotaError, setRotaError] = useState<string | null>(null);
  const [swapRequests, setSwapRequests] = useState<RotaSwapRequest[]>([]);
  const [swapShift, setSwapShift] = useState<Shift | null>(null);
  const [swapNote, setSwapNote] = useState("");
  const [swapSubmitting, setSwapSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const staffId = session?.staff_id ?? null;

  const weekStart = getWeekMonday(weekOf);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = DAYS_SHORT.map((_, index) => addDays(weekStart, index));

  const [mYear, mMonth] = monthOf.split("-").map(Number);
  const firstDay = new Date(mYear, mMonth - 1, 1);
  const daysInMonth = new Date(mYear, mMonth, 0).getDate();
  const startPad = (firstDay.getDay() + 6) % 7;

  const monthLabel = new Date(mYear, mMonth - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const { start: monthStart, end: monthEnd } = getMonthBounds(monthOf);

  useEffect(() => {
    if (!staffId) return;

    const controller = new AbortController();
    const from = view === "week" ? weekStart : monthStart;
    const to = view === "week" ? weekEnd : monthEnd;

    async function loadRota() {
      setRotaLoading(true);
      setRotaError(null);

      try {
        const params = new URLSearchParams({ from, to });
        const [rotaResponse, swapResponse] = await Promise.all([
          fetch(`/api/staff/rota?${params.toString()}`, {
            method: "GET",
            signal: controller.signal,
          }),
          fetch("/api/staff/rota-requests", {
            method: "GET",
            signal: controller.signal,
          }),
        ]);

        if (!rotaResponse.ok) {
          const payload = await rotaResponse.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load rota.");
        }

        if (!swapResponse.ok) {
          const payload = await swapResponse.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load swap requests.");
        }

        const rotaPayload = await rotaResponse.json().catch(() => null);
        const assignments = Array.isArray(rotaPayload?.assignments) ? (rotaPayload.assignments as Shift[]) : [];
        setRotaItems(assignments);

        const swapPayload = await swapResponse.json().catch(() => null);
        const requests = Array.isArray(swapPayload?.requests) ? (swapPayload.requests as RotaSwapRequest[]) : [];
        setSwapRequests(requests);
      } catch (error) {
        if (controller.signal.aborted) return;
        setRotaItems([]);
        setSwapRequests([]);
        setRotaError(error instanceof Error ? error.message : "Failed to load rota.");
      } finally {
        if (!controller.signal.aborted) setRotaLoading(false);
      }
    }

    void loadRota();
    return () => controller.abort();
  }, [staffId, view, weekStart, weekEnd, monthStart, monthEnd]);

  if (!session) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const currentSession = session;

  const thisWeekShifts = rotaItems.filter((shift) => shift.shift_date >= weekStart && shift.shift_date <= weekEnd);
  const weekHours = thisWeekShifts.reduce((sum, shift) => sum + shiftHours(shift), 0);

  const monthShifts = rotaItems.filter((shift) => shift.shift_date.startsWith(monthOf));
  const monthHours = monthShifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const openSwapRequests = swapRequests.filter((request) => request.status === "pending");

  async function submitSwap() {
    if (!swapShift) return;
    if (!currentSession) return;
    setSwapSubmitting(true);

    try {
      const response = await fetch("/api/staff/rota-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: swapShift.id,
          reason: swapNote.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to submit swap request.");
      }

      const created = payload?.request as RotaSwapRequest | undefined;
      if (created) {
        setSwapRequests((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      }

      pushNotification({
        category: "hr",
        severity: "warning",
        title: "New shift swap request",
        body: `${currentSession.full_name} requested a swap for ${fmt(swapShift.shift_date, { day: "numeric", month: "short" })}.`,
        href: `/app/${currentSession.department}/rota`,
        targetDepartments: ["hr", "admin"],
      });

      setToast(`Swap request submitted for ${fmt(swapShift.shift_date, { day: "numeric", month: "short" })}.`);
      setSwapShift(null);
      setSwapNote("");
      window.setTimeout(() => setToast(null), 3500);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to submit swap request.");
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setSwapSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Rota</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {`${currentSession.full_name} - ${currentSession.department}`}
        </p>
      </div>

      {(rotaLoading || rotaError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            rotaError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {rotaError ?? "Loading rota from HOD schedules..."}
        </div>
      )}

      <div className="flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
        {(["week", "month"] as View[]).map((itemView) => (
          <button
            key={itemView}
            onClick={() => setView(itemView)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
              view === itemView ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {itemView} View
          </button>
        ))}
      </div>

      {view === "week" && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setWeekOf(addDays(weekStart, -7))}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {"<- Prev"}
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">
                  {fmt(weekStart, { day: "numeric", month: "long" })} -{" "}
                  {fmt(weekEnd, { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-slate-400">
                  {thisWeekShifts.length} shift{thisWeekShifts.length !== 1 ? "s" : ""} · {weekHours}h
                </p>
              </div>
              <button
                onClick={() => setWeekOf(addDays(weekStart, 7))}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {"Next >"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {weekDates.map((date, index) => {
              const dayShifts = rotaItems.filter((shift) => shift.shift_date === date);
              const isToday = date === todayISO;

              return (
                <div
                  key={date}
                  className={`rounded-xl border bg-white p-3.5 ${
                    isToday ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-xs font-bold ${isToday ? "text-indigo-600" : "text-slate-400"}`}>
                      {DAYS_SHORT[index]}
                    </span>
                    <span className={`text-sm font-bold ${isToday ? "text-indigo-700" : "text-slate-700"}`}>
                      {fmt(date, { day: "numeric", month: "short" })}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                        Today
                      </span>
                    )}
                    {dayShifts.length === 0 && <span className="ml-auto text-xs text-slate-300">Day off</span>}
                  </div>

                  {dayShifts.map((shift) => {
                    const colorClass = SHIFT_COLORS[shift.shift_type] ?? SHIFT_COLORS.morning;
                    const statusClass = STATUS_STYLES[shift.status] ?? "text-slate-500";
                    const request = swapRequests.find((item) => item.assignmentId === shift.id);
                    const canRequestSwap = !request || request.status === "rejected" || request.status === "cancelled";

                    return (
                      <div
                        key={shift.id}
                        className={`mt-1.5 flex items-center justify-between rounded-lg border px-3 py-2 ${colorClass}`}
                      >
                        <div>
                          <p className={`text-xs font-bold capitalize ${statusClass}`}>
                            {getShiftLabel(shift)} · {getShiftUnitLabel(shift)}
                          </p>
                          <p className="text-[11px] opacity-70">
                            {shift.shift_start ?? "00:00"} - {shift.shift_end ?? "00:00"} ({shiftHours(shift)}h)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] capitalize ${statusClass}`}>{shift.status}</span>
                          {shift.status !== "completed" &&
                            shift.status !== "cancelled" &&
                            canRequestSwap && (
                              <button
                                onClick={() => setSwapShift(shift)}
                                className="rounded-lg border border-current/20 bg-white/50 px-2 py-0.5 text-[10px] font-bold transition hover:bg-white/80"
                              >
                                Swap
                              </button>
                            )}
                          {request && (
                            <span className={`text-[10px] font-bold ${REQUEST_STATUS_STYLES[request.status] ?? "text-violet-600"}`}>
                              {getRequestLabel(request.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "month" && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  const previous = new Date(mYear, mMonth - 2, 1);
                  setMonthOf(previous.toISOString().slice(0, 7));
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {"<- Prev"}
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">{monthLabel}</p>
                <p className="text-xs text-slate-400">
                  {monthShifts.length} shift{monthShifts.length !== 1 ? "s" : ""} · {monthHours}h
                </p>
              </div>
              <button
                onClick={() => {
                  const next = new Date(mYear, mMonth, 1);
                  setMonthOf(next.toISOString().slice(0, 7));
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {"Next >"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                <div key={day} className="py-2 text-center text-[11px] font-bold text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: startPad }, (_, index) => (
                <div key={`pad-${index}`} className="min-h-[52px] border-b border-r border-slate-50" />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const dateStr = `${monthOf}-${String(day).padStart(2, "0")}`;
                const shifts = rotaItems.filter((shift) => shift.shift_date === dateStr);
                const isToday = dateStr === todayISO;

                return (
                  <div
                    key={day}
                    className={`min-h-[52px] border-b border-r border-slate-100 p-1 ${
                      isToday ? "bg-indigo-50" : ""
                    }`}
                  >
                    <p className={`mb-0.5 text-right text-[11px] font-bold ${isToday ? "text-indigo-600" : "text-slate-500"}`}>
                      {day}
                    </p>
                    {shifts.slice(0, 1).map((shift) => (
                      <div
                        key={shift.id}
                        className={`truncate rounded px-1 py-0.5 text-[9px] font-bold capitalize ${
                          SHIFT_COLORS[shift.shift_type] ?? SHIFT_COLORS.morning
                        }`}
                      >
                        {getShiftLabel(shift)}
                      </div>
                    ))}
                    {shifts.length > 1 && <p className="text-[8px] text-slate-400">+{shifts.length - 1}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {monthShifts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">All Shifts This Month</p>
                  {monthShifts.map((shift) => {
                    const colorClass = SHIFT_COLORS[shift.shift_type] ?? SHIFT_COLORS.morning;
                    const statusClass = STATUS_STYLES[shift.status] ?? "text-slate-500";
                    const request = swapRequests.find((item) => item.assignmentId === shift.id);
                    const canRequestSwap = !request || request.status === "rejected" || request.status === "cancelled";

                    return (
                  <div
                    key={shift.id}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 ${colorClass}`}
                  >
                    <div>
                      <p className={`text-sm font-bold capitalize ${statusClass}`}>
                        {fmt(shift.shift_date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                        {getShiftUnitLabel(shift)}
                      </p>
                      <p className="text-xs opacity-70">
                        {getShiftLabel(shift)} · {shift.shift_start ?? "00:00"}-{shift.shift_end ?? "00:00"}
                      </p>
                    </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{shiftHours(shift)}h</span>
                        {shift.status !== "completed" &&
                          shift.status !== "cancelled" &&
                          canRequestSwap && (
                            <button
                              onClick={() => setSwapShift(shift)}
                              className="rounded-lg border border-current/20 bg-white/60 px-2 py-0.5 text-[10px] font-bold hover:bg-white/90"
                            >
                              Swap
                            </button>
                          )}
                        {request && (
                          <span className={`text-[10px] font-bold ${REQUEST_STATUS_STYLES[request.status] ?? "text-violet-700"}`}>
                            {getRequestLabel(request.status)}
                          </span>
                        )}
                      </div>
                    </div>
                );
              })}
            </div>
          ) : (
            !rotaLoading && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                No rota assignments found for this month.
              </div>
            )
          )}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Swap Requests</h3>
                <p className="text-xs text-slate-500">Requests submitted for HOD / HR review.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                {openSwapRequests.length} pending
              </span>
            </div>
            {swapRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                No shift swap requests yet.
              </div>
            ) : (
              <div className="space-y-2">
                {swapRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {fmt(request.shiftDate, { weekday: "short", day: "numeric", month: "short" })} · {request.shiftType.replace("_", " ")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {request.unitName ?? request.department} · {request.reason ?? "No reason provided"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold capitalize ${REQUEST_STATUS_STYLES[request.status] ?? "text-slate-500"}`}>
                      {getRequestLabel(request.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {swapShift && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <div>
              <h3 className="font-black text-slate-900">Request Shift Swap</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {fmt(swapShift.shift_date, { weekday: "long", day: "numeric", month: "long" })} -{" "}
                {swapShift.shift_start ?? "00:00"}-{swapShift.shift_end ?? "00:00"} - {getShiftUnitLabel(swapShift)}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Reason / Note for HR</label>
              <textarea
                rows={3}
                value={swapNote}
                onChange={(event) => setSwapNote(event.target.value)}
                placeholder="Explain why you need a swap..."
                className={inputCls}
              />
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Your HOD and HR will be notified. Approval is not guaranteed.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSwapShift(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={submitSwap}
                disabled={swapSubmitting}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {swapSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      <p className="text-center text-xs text-slate-300">
        Contact your HOD or HR to request amendments.
      </p>
    </div>
  );
}
