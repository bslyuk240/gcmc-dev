"use client";

import { useState } from "react";
import { useHMSSession } from "@/modules/rbac/hooks";

type LeaveType   = "Annual" | "Sick" | "Maternity" | "Paternity" | "Personal" | "Emergency" | "Study";
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

type LeaveRequest = {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedBy?: string;
};

const MOCK_LEAVE: LeaveRequest[] = [
  { id: "LV-001", type: "Annual",    startDate: "2026-04-07", endDate: "2026-04-11", days: 5, reason: "Family vacation", status: "Approved",  appliedOn: "2026-03-10", reviewedBy: "HR Manager" },
  { id: "LV-002", type: "Sick",      startDate: "2026-03-03", endDate: "2026-03-04", days: 2, reason: "Fever and flu",   status: "Approved",  appliedOn: "2026-03-03", reviewedBy: "HR Manager" },
  { id: "LV-003", type: "Personal",  startDate: "2026-03-25", endDate: "2026-03-25", days: 1, reason: "Personal matter", status: "Pending",  appliedOn: "2026-03-15" },
];

const LEAVE_TYPES: LeaveType[] = ["Annual", "Sick", "Maternity", "Paternity", "Personal", "Emergency", "Study"];

const STATUS_STYLES: Record<LeaveStatus, string> = {
  Pending:   "bg-amber-100  text-amber-700",
  Approved:  "bg-emerald-100 text-emerald-700",
  Rejected:  "bg-red-100    text-red-700",
  Cancelled: "bg-slate-100  text-slate-500",
};

export default function LeavePage() {
  const session  = useHMSSession();
  const [requests, setRequests] = useState<LeaveRequest[]>(MOCK_LEAVE);
  const [showForm, setShowForm] = useState(false);
  const [type, setType]         = useState<LeaveType>("Annual");
  const [startDate, setStart]   = useState("");
  const [endDate, setEnd]       = useState("");
  const [reason, setReason]     = useState("");
  const [toast, setToast]       = useState<string | null>(null);

  function countDays(s: string, e: string) {
    if (!s || !e) return 0;
    const ms = new Date(e).getTime() - new Date(s).getTime();
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }

  function handleSubmit() {
    if (!startDate || !endDate || !reason) { setToast("Please fill in all fields."); return; }
    const req: LeaveRequest = {
      id: `LV-${String(Date.now()).slice(-4)}`,
      type, startDate, endDate, reason, status: "Pending",
      appliedOn: new Date().toISOString().slice(0, 10),
      days: countDays(startDate, endDate),
    };
    setRequests((prev) => [req, ...prev]);
    setToast("Leave request submitted successfully.");
    setShowForm(false); setStart(""); setEnd(""); setReason(""); setType("Annual");
    setTimeout(() => setToast(null), 3000);
  }

  const annual   = requests.filter((r) => r.type === "Annual" && r.status === "Approved").reduce((s, r) => s + r.days, 0);
  const pending  = requests.filter((r) => r.status === "Pending").length;

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Leave</h1>
        <p className="mt-1 text-sm text-slate-500">Apply for leave and track approval status.</p>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Annual Used", value: annual, unit: "days", color: "text-indigo-700" },
          { label: "Remaining",   value: Math.max(0, 21 - annual), unit: "days", color: "text-emerald-700" },
          { label: "Pending",     value: pending, unit: "requests", color: pending > 0 ? "text-amber-600" : "text-slate-400" },
        ].map((b) => (
          <div key={b.label} className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-center">
            <p className={`text-xl font-black ${b.color}`}>{b.value}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{b.unit}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{b.label}</p>
          </div>
        ))}
      </div>

      {/* Apply button */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700">
          + Apply for Leave
        </button>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-white p-4 space-y-3">
          <p className="font-bold text-slate-900">New Leave Request</p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Leave Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as LeaveType)} className={inputCls}>
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-indigo-600 font-semibold">{countDays(startDate, endDate)} day(s) requested</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Reason</label>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Brief reason..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white">Submit</button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Leave History</p>
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{r.type} Leave</p>
                    <span className="font-mono text-xs text-slate-400">{r.id}</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(r.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {" – "}
                    {new Date(r.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {" · "}{r.days} day{r.days !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{r.reason}</p>
                  {r.reviewedBy && <p className="text-[10px] text-slate-300 mt-0.5">Reviewed by {r.reviewedBy}</p>}
                </div>
                <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[r.status]}`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 inset-x-4 mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
