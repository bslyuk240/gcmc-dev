"use client";

import { useCallback, useEffect, useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useStaffPortalStore } from "@/lib/hooks/use-staff-portal-store";
import { submitLeaveRequest } from "@/lib/staff-portal/client";
import {
  type LeaveType,
  type LeaveStatus,
  type LeaveRequest,
} from "@/lib/data/hr-store";

const LEAVE_TYPES: LeaveType[] = ["Annual", "Sick", "Maternity", "Paternity", "Personal", "Emergency", "Study"];

const STATUS_STYLES: Record<LeaveStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export default function LeavePage() {
  const session = useHMSSession();
  const { policies: leavePolicies } = useStaffPortalStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<LeaveType>("Annual");
  const [startDate, setStart] = useState("");
  const [endDate, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leave/requests?mine=1");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const currentYear = new Date().getFullYear();
  const leavePolicy = leavePolicies.find((policy) => policy.year === currentYear) ?? null;
  const annualTotal = (leavePolicy?.annualDays ?? 21) + (leavePolicy?.carryForwardDays ?? 0);

  function countDays(start: string, end: string) {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }

  async function handleSubmit() {
    if (!session || !startDate || !endDate || !reason) {
      setToast("Please fill in all fields.");
      return;
    }

    setSaving(true);

    try {
      await submitLeaveRequest({
        leaveType: type,
        startDate,
        endDate,
        days: countDays(startDate, endDate),
        reason,
      });

      setToast("Leave request submitted successfully.");
      setShowForm(false);
      setStart("");
      setEnd("");
      setReason("");
      setType("Annual");
      await load();
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to submit leave request.");
    } finally {
      setSaving(false);
    }
  }

  const annual = requests
    .filter((request) =>
      request.leaveType === "Annual"
      && request.status === "Approved"
      && new Date(`${request.startDate}T00:00:00`).getFullYear() === currentYear)
    .reduce((sum, request) => sum + request.days, 0);
  const pending = requests.filter((request) => request.status === "Pending").length;
  const remaining = Math.max(0, annualTotal - annual);
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Leave</h1>
        <p className="mt-1 text-sm text-slate-500">Apply for leave and track approval status from HR records.</p>
        <p className="mt-1 text-xs font-semibold text-indigo-600">
          {currentYear} entitlement: {annualTotal} days
          {leavePolicy ? "" : " (default until HR sets the year policy)"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: `Annual Used (${currentYear})`, value: annual, unit: "days", color: "text-indigo-700" },
          { label: "Remaining", value: remaining, unit: "days", color: "text-emerald-700" },
          { label: "Pending", value: pending, unit: "requests", color: pending > 0 ? "text-amber-600" : "text-slate-400" },
        ].map((block) => (
          <div key={block.label} className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center">
            <p className={`text-xl font-black ${block.color}`}>{block.value}</p>
            <p className="text-[10px] leading-tight text-slate-400">{block.unit}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{block.label}</p>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          + Apply for Leave
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-white p-4">
          <p className="font-bold text-slate-900">New Leave Request</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Leave Type</label>
            <select value={type} onChange={(event) => setType(event.target.value as LeaveType)} className={inputCls}>
              {LEAVE_TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Start Date</label>
              <input type="date" value={startDate} onChange={(event) => setStart(event.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">End Date</label>
              <input type="date" value={endDate} onChange={(event) => setEnd(event.target.value)} className={inputCls} />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs font-semibold text-indigo-600">{countDays(startDate, endDate)} day(s) requested</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Reason</label>
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className={inputCls} placeholder="Brief reason..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">
              Cancel
            </button>
            <button onClick={() => void handleSubmit()} disabled={saving} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Leave History</p>
        <div className="space-y-2">
          {loading && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              Loading leave records...
            </div>
          )}
          {!loading && requests.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              No leave records yet. Submit a request above.
            </div>
          )}
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{request.leaveType} Leave</p>
                  <p className="text-sm text-slate-500">
                    {new Date(request.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" - "}
                    {new Date(request.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{request.days} day{request.days !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{request.reason}</p>
                  {request.reviewedBy && <p className="mt-0.5 text-[10px] text-slate-300">Reviewed by {request.reviewedBy}</p>}
                </div>
                <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[request.status]}`}>{request.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
