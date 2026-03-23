"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { DB_TO_STAFF_DEPT } from "@/lib/data/hr-store";
import { updateLeaveStatus } from "@/lib/data/admin-store";

const DEPT_STAFF: Record<string, { count: number; active: number }> = {
  Doctors: { count: 18, active: 16 }, Nurses: { count: 34, active: 31 },
  Pharmacy: { count: 12, active: 12 }, "Front Desk": { count: 8, active: 7 },
  Accounts: { count: 9, active: 9 }, Store: { count: 6, active: 6 },
  Administration: { count: 5, active: 5 }, IT: { count: 7, active: 7 }, HR: { count: 6, active: 6 },
};

const LEAVE_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
};

const LEAVE_TYPE_STYLES: Record<string, string> = {
  Annual: "bg-sky-50 text-sky-700", Sick: "bg-amber-50 text-amber-700",
  Maternity: "bg-pink-50 text-pink-700", Personal: "bg-slate-100 text-slate-600",
  Emergency: "bg-red-50 text-red-700",
};

const UPCOMING = [
  { event: "Quarterly performance reviews due", date: "Mar 31, 2026", tag: "Review" },
  { event: "Contract renewal — Nurse Patricia", date: "Apr 15, 2026", tag: "Contract" },
  { event: "New staff orientation — 2 hires", date: "Mar 17, 2026", tag: "Onboarding" },
  { event: "Payroll processing deadline", date: "Mar 25, 2026", tag: "Payroll" },
];

function departmentLabel(value: string) {
  return DB_TO_STAFF_DEPT[value] ?? value;
}

export default function AdminHRMonitorPage() {
  const { hrLeaveRequests, metrics } = useAdminStore();
  const [leaveAction, setLeaveAction] = useState<{ id: string; action: "Approved" | "Rejected" } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  function handleLeave() {
    if (!leaveAction) return;
    updateLeaveStatus(leaveAction.id, leaveAction.action);
    const req = hrLeaveRequests.find((l) => l.id === leaveAction.id);
    setToast({ message: `Leave request for ${req?.staffName} ${leaveAction.action.toLowerCase()}.`, type: leaveAction.action === "Approved" ? "success" : "info" });
    setLeaveAction(null);
  }

  const totalStaff = Object.values(DEPT_STAFF).reduce((s, d) => s + d.count, 0);
  const activeStaff = Object.values(DEPT_STAFF).reduce((s, d) => s + d.active, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="HR Monitor" description="Staffing oversight — staff count by department, leave management, onboarding, and workforce compliance." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Staff", value: totalStaff, color: "text-slate-900" },
          { label: "Active Today", value: activeStaff, color: "text-emerald-700" },
          { label: "On Leave", value: metrics.staffOnLeave, color: metrics.staffOnLeave > 5 ? "text-amber-600" : "text-slate-500" },
          { label: "Leave Requests Pending", value: metrics.pendingLeave, color: metrics.pendingLeave > 0 ? "text-violet-700" : "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Leave requests */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Leave Requests</h3>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {hrLeaveRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  No leave requests yet.
                </div>
              ) : (
                hrLeaveRequests.map((l) => (
                  <Card key={l.id} className="overflow-hidden p-0">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{l.staffName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{departmentLabel(l.department)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEAVE_STYLES[l.status]}`}>{l.status}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Leave Type</p>
                        <p className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${LEAVE_TYPE_STYLES[l.leaveType] ?? "bg-slate-100 text-slate-600"}`}>{l.leaveType}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Dates</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{l.startDate} – {l.endDate}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Days</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{l.days}d</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{l.status}</p>
                      </div>
                    </div>
                    {l.status === "Pending" ? (
                      <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
                        <Button size="sm" onClick={() => setLeaveAction({ id: l.id, action: "Approved" })} className="flex-1">Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setLeaveAction({ id: l.id, action: "Rejected" })} className="flex-1">Reject</Button>
                      </div>
                    ) : null}
                  </Card>
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Staff Member", "Department", "Leave Type", "Dates", "Days", "Status", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hrLeaveRequests.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{l.staffName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{departmentLabel(l.department)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEAVE_TYPE_STYLES[l.leaveType] ?? "bg-slate-100 text-slate-600"}`}>{l.leaveType}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{l.startDate} – {l.endDate}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{l.days}d</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEAVE_STYLES[l.status]}`}>{l.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === "Pending" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => setLeaveAction({ id: l.id, action: "Approved" })}>Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => setLeaveAction({ id: l.id, action: "Rejected" })}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Staff by department */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Staffing by Department</h3>
            </div>
            <div className="grid gap-3 p-3 md:hidden">
              {Object.entries(DEPT_STAFF).map(([dept, data]) => (
                <Card key={dept} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{dept}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Total: <strong className="text-slate-800">{data.count}</strong> · Active: <strong className="text-emerald-700">{data.active}</strong>
                      </p>
                    </div>
                    {data.count - data.active > 0 ? (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {data.count - data.active} on leave
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(data.active / data.count) * 100}%` }} />
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden divide-y divide-slate-100 md:block">
              {Object.entries(DEPT_STAFF).map(([dept, data]) => (
                <div key={dept} className="flex items-center gap-4 px-5 py-3">
                  <p className="flex-1 text-sm font-medium text-slate-900">{dept}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-500">Total: <strong className="text-slate-800">{data.count}</strong></span>
                    <span className="text-emerald-700 font-semibold">Active: {data.active}</span>
                    {data.count - data.active > 0 && <span className="text-amber-600">{data.count - data.active} on leave</span>}
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(data.active / data.count) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Upcoming HR Events</h3>
            <div className="space-y-2">
              {UPCOMING.map((u) => (
                <div key={u.event} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-800">{u.event}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-slate-400">{u.date}</span>
                    <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-bold">{u.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!leaveAction} onClose={() => setLeaveAction(null)} title={`${leaveAction?.action === "Approved" ? "Approve" : "Reject"} Leave Request`}>
        {leaveAction && (
          <p className="text-sm text-slate-700">
            {leaveAction.action === "Approved" ? "Approve" : "Reject"} leave request for{" "}
            <strong>{hrLeaveRequests.find((l) => l.id === leaveAction.id)?.staffName}</strong>?
          </p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setLeaveAction(null)}>Cancel</Button>
          <Button size="md" onClick={handleLeave}>{leaveAction?.action === "Approved" ? "Approve Leave" : "Reject Leave"}</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
