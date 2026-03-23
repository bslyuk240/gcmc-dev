"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { updateLeaveStatus, type LeaveRequest } from "@/lib/data/hr-store";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const LEAVE_TYPE_STYLES: Record<string, string> = {
  Annual: "bg-sky-50 text-sky-700",
  Sick: "bg-amber-50 text-amber-700",
  Maternity: "bg-pink-50 text-pink-700",
  Paternity: "bg-indigo-50 text-indigo-700",
  Personal: "bg-slate-100 text-slate-600",
  Emergency: "bg-red-50 text-red-700",
  Study: "bg-violet-50 text-violet-700",
};

const DEPT_COLORS: Record<string, string> = {
  Doctors: "bg-violet-50 text-violet-700",
  Nurses: "bg-pink-50 text-pink-700",
  Pharmacy: "bg-emerald-50 text-emerald-700",
  Lab: "bg-sky-50 text-sky-700",
  "Front Desk": "bg-amber-50 text-amber-700",
  Accounts: "bg-teal-50 text-teal-700",
  IT: "bg-cyan-50 text-cyan-700",
  HR: "bg-slate-100 text-slate-700",
};

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function LeaveManagementPage() {
  const { leaveRequests, metrics } = useHRStore();
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [filterDept, setFilterDept] = useState("All");
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<"Approved" | "Rejected" | null>(null);
  const [reviewerName, setReviewerName] = useState("HR Manager");
  const [hrNotes, setHrNotes] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [saving, setSaving] = useState(false);

  const allDepts = ["All", ...Array.from(new Set(leaveRequests.map((l) => l.department)))];

  const filtered = leaveRequests.filter((l) => {
    const statusMatch = filterStatus === "All" || l.status === filterStatus;
    const deptMatch = filterDept === "All" || l.department === filterDept;
    return statusMatch && deptMatch;
  });

  function openReview(req: LeaveRequest, act: "Approved" | "Rejected") {
    setReviewTarget(req);
    setAction(act);
    setHrNotes("");
  }

  async function handleReview() {
    if (!reviewTarget || !action) return;
    setSaving(true);
    try {
      await updateLeaveStatus(reviewTarget.id, action, reviewerName, hrNotes);
      setToast({ message: `${reviewTarget.staffName}'s leave request ${action.toLowerCase()}.`, type: action === "Approved" ? "success" : "info" });
      setReviewTarget(null);
      setAction(null);
    } catch {
      setToast({ message: "Failed to update leave request.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200";

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description="Review and manage leave requests from all departments. Approved leave updates staff status automatically." />

      <div className="flex justify-end">
        <Link
          href={`${INTERNAL_PREFIX}/hr/leave-settings`}
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
        >
          Annual Leave Settings
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Requests", value: leaveRequests.length, color: "text-slate-900" },
          { label: "Pending Review", value: metrics.pendingLeave, color: metrics.pendingLeave > 0 ? "text-amber-600" : "text-slate-500" },
          { label: "Approved", value: leaveRequests.filter((l) => l.status === "Approved").length, color: "text-emerald-700" },
          { label: "Rejected", value: leaveRequests.filter((l) => l.status === "Rejected").length, color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Leave Requests</h3>
          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex gap-1.5">
              {(["All", "Pending", "Approved", "Rejected"] as const).map((f) => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filterStatus === f ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {f}
                </button>
              ))}
            </div>
            {/* Dept filter */}
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 outline-none">
              {allDepts.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {filtered.map((l) => (
            <div key={l.id} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${l.status === "Pending" ? "ring-1 ring-amber-100" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{l.staffName}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{l.role}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[l.status]}`}>{l.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MobileMeta label="Department" value={l.department} />
                <MobileMeta label="Leave Type" value={l.leaveType} />
                <MobileMeta label="Start" value={l.startDate} />
                <MobileMeta label="End" value={l.endDate} />
                <MobileMeta label="Days" value={l.days} />
                <MobileMeta label="Reviewer" value={l.reviewedBy || "—"} />
              </div>
              {l.status === "Pending" ? (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => openReview(l, "Approved")}>Approve</Button>
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => openReview(l, "Rejected")}>Reject</Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">{l.reviewedBy ? `By ${l.reviewedBy}` : "—"}</p>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
              No leave requests in this category.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Staff", "Department", "Role", "Leave Type", "Start", "End", "Days", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} className={`hover:bg-slate-50 ${l.status === "Pending" ? "bg-amber-50/15" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{l.staffName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DEPT_COLORS[l.department] ?? "bg-slate-100 text-slate-600"}`}>{l.department}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{l.role}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEAVE_TYPE_STYLES[l.leaveType] ?? "bg-slate-100 text-slate-600"}`}>{l.leaveType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{l.startDate}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{l.endDate}</td>
                  <td className="px-4 py-3 font-bold text-center text-slate-700">{l.days}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[l.status]}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "Pending" ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" onClick={() => openReview(l, "Approved")}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => openReview(l, "Rejected")}>Reject</Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">{l.reviewedBy ? `By ${l.reviewedBy}` : "—"}</p>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No leave requests in this category.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Modal */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)}
        title={`${action === "Approved" ? "Approve" : "Reject"} Leave — ${reviewTarget?.staffName}`}>
        {reviewTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Department</span><strong>{reviewTarget.department}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Leave Type</span><span>{reviewTarget.leaveType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duration</span><span>{reviewTarget.startDate} – {reviewTarget.endDate} <strong>({reviewTarget.days} days)</strong></span></div>
              <div className="flex justify-between"><span className="text-slate-500">Reason</span><span className="text-right max-w-[200px]">{reviewTarget.reason}</span></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reviewed By</label>
              <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">HR Notes (optional)</label>
              <textarea rows={2} value={hrNotes} onChange={(e) => setHrNotes(e.target.value)}
                placeholder="Add review notes..." className={inputCls} />
            </div>
            {action === "Approved" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-semibold">
                Staff status will automatically update to &quot;On Leave&quot; when approved.
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setReviewTarget(null)}>Cancel</Button>
          <Button size="md" onClick={() => void handleReview()} disabled={saving}>
            {saving ? "Saving..." : action === "Approved" ? "Approve Leave" : "Reject Leave"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
