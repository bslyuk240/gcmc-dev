"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";

type LeaveType = "Annual" | "Sick" | "Emergency" | "Maternity / Paternity" | "Compassionate" | "Unpaid";
type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRequest = { id: string; type: LeaveType; start: string; end: string; days: number; reason: string; status: LeaveStatus; applied: string };

const INITIAL: LeaveRequest[] = [
  { id: "LR-0021", type: "Annual", start: "2026-04-01", end: "2026-04-07", days: 7, reason: "Family vacation.", status: "Pending", applied: "Mar 10, 2026" },
  { id: "LR-0018", type: "Sick", start: "2026-02-14", end: "2026-02-15", days: 2, reason: "Flu recovery.", status: "Approved", applied: "Feb 14, 2026" },
  { id: "LR-0015", type: "Emergency", start: "2026-01-05", end: "2026-01-05", days: 1, reason: "Personal emergency.", status: "Approved", applied: "Jan 5, 2026" },
];

const STATUS_STYLES: Record<LeaveStatus, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

export default function ProfileLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const [leaveType, setLeaveType] = useState<LeaveType>("Annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function calcDays(start: string, end: string) {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate || !reason) return;
    const days = calcDays(startDate, endDate);
    if (days <= 0) { return; }
    const req: LeaveRequest = {
      id: `LR-${String(requests.length + 22).padStart(4, "0")}`,
      type: leaveType, start: startDate, end: endDate, days, reason,
      status: "Pending", applied: "Mar 15, 2026",
    };
    setRequests((prev) => [req, ...prev]);
    setToast({ message: `Leave request ${req.id} submitted. Awaiting HR approval.`, type: "success" });
    setShowModal(false);
    setLeaveType("Annual"); setStartDate(""); setEndDate(""); setReason("");
  }

  const balances = [
    { label: "Annual Leave", used: 3, total: 21, color: "bg-sky-500" },
    { label: "Sick Leave", used: 2, total: 10, color: "bg-amber-400" },
    { label: "Emergency Leave", used: 1, total: 3, color: "bg-red-400" },
  ];

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leave Requests"
        description="Submit and track your leave applications."
        action={<Button onClick={() => setShowModal(true)}>+ New Leave Request</Button>}
      />

      {/* Leave balances */}
      <div className="grid gap-4 sm:grid-cols-3">
        {balances.map((b) => (
          <Card key={b.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{b.label}</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-bold text-slate-900">{b.total - b.used}</span>
              <span className="mb-1 text-sm text-slate-400">/ {b.total} days left</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${b.color}`} style={{ width: `${((b.total - b.used) / b.total) * 100}%` }} />
            </div>
          </Card>
        ))}
      </div>

      {/* My leave history */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">My Leave History</h3>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-400 mb-4">No leave requests yet.</p>
            <Button onClick={() => setShowModal(true)}>Submit a Request</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["Ref", "Type", "From", "To", "Days", "Reason", "Applied", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{r.type}</td>
                    <td className="px-5 py-3 text-slate-600">{r.start}</td>
                    <td className="px-5 py-3 text-slate-600">{r.end}</td>
                    <td className="px-5 py-3 font-bold text-slate-900">{r.days}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-[180px] truncate">{r.reason}</td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{r.applied}</td>
                    <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New leave request modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Leave Request">
        <form id="leave-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} className={inputCls}>
              {(["Annual", "Sick", "Emergency", "Maternity / Paternity", "Compassionate", "Unpaid"] as LeaveType[]).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
              <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
              <input required type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          {startDate && endDate && calcDays(startDate, endDate) > 0 && (
            <p className="text-sm text-slate-600">Duration: <strong>{calcDays(startDate, endDate)} day(s)</strong></p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for leave…" className={`${inputCls} resize-none`} />
          </div>
        </form>
        <ModalFooter>
          <Button variant="ghost" size="md" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button size="md" type="submit" form="leave-form">Submit Request</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
