"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { updateApprovalStatus, type AdminApproval } from "@/lib/data/admin-store";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Escalated: "bg-orange-50 text-orange-700 font-bold",
};

const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-slate-100 text-slate-600",
  Normal: "bg-sky-50 text-sky-700",
  High: "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700 font-bold",
};

const CATEGORY_COLORS: Record<string, string> = {
  Financial: "bg-emerald-50 text-emerald-700",
  Procurement: "bg-violet-50 text-violet-700",
  HR: "bg-pink-50 text-pink-700",
  Clinical: "bg-sky-50 text-sky-700",
  IT: "bg-cyan-50 text-cyan-700",
  Other: "bg-slate-100 text-slate-600",
};

export default function AdminApprovalsPage() {
  const { approvals, metrics } = useAdminStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Escalated" | "Approved" | "Rejected">("All");
  const [reviewTarget, setReviewTarget] = useState<AdminApproval | null>(null);
  const [action, setAction] = useState<"Approved" | "Rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [reviewer, setReviewer] = useState("Admin Dr. Asante");
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = filter === "All" ? approvals : approvals.filter((a) =>
    filter === "Pending" ? (a.status === "Pending" || a.status === "Escalated") : a.status === filter
  );

  function openReview(approval: AdminApproval, act: "Approved" | "Rejected") {
    setReviewTarget(approval);
    setAction(act);
    setNotes("");
  }

  function handleReview() {
    if (!reviewTarget || !action) return;
    updateApprovalStatus(reviewTarget.id, action, reviewer, notes);
    setToast({ message: `${reviewTarget.title} — ${action}.`, type: action === "Approved" ? "success" : "info" });
    setReviewTarget(null);
    setAction(null);
    setNotes("");
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals Queue"
        description="Admin approval centre — financial requests, HR actions, procurement, clinical overrides, and IT authorisations."
      />

      <div className="flex gap-3">
        {[
          { label: "Pending Approvals", value: metrics.pendingApprovals, color: metrics.pendingApprovals > 0 ? "text-amber-600" : "text-slate-500" },
          { label: "Escalated", value: metrics.escalatedApprovals, color: metrics.escalatedApprovals > 0 ? "text-orange-700" : "text-slate-500" },
          { label: "Approved (total)", value: approvals.filter((a) => a.status === "Approved").length, color: "text-emerald-700" },
          { label: "Rejected", value: approvals.filter((a) => a.status === "Rejected").length, color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Approval Requests</h3>
          <div className="flex gap-1.5">
            {(["All", "Pending", "Escalated", "Approved", "Rejected"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((a) => (
            <div key={a.id} className={`px-5 py-4 ${a.status === "Escalated" ? "bg-orange-50/30" : a.priority === "Critical" ? "bg-red-50/20" : ""}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[a.category]}`}>{a.category}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[a.priority]}`}>{a.priority}</span>
                    <span className="text-xs text-slate-400">#{a.id}</span>
                  </div>
                  <p className="text-sm text-slate-600">{a.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>Department: <strong className="text-slate-600">{a.department}</strong></span>
                    <span>Requested by: {a.requestedBy}</span>
                    <span>{a.requestedAt}</span>
                    {a.amount && <span className="font-bold text-slate-700">₦{a.amount.toLocaleString()}</span>}
                  </div>
                  {a.reviewedBy && (
                    <p className="text-xs text-slate-400">Reviewed by {a.reviewedBy} · {a.reviewedAt}{a.notes ? ` · ${a.notes}` : ""}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                  {(a.status === "Pending" || a.status === "Escalated") && (
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => openReview(a, "Approved")}>Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => openReview(a, "Rejected")}>Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">No approval requests in this category.</div>
          )}
        </div>
      </Card>

      {/* Review Modal */}
      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)}
        title={`${action === "Approved" ? "Approve" : "Reject"} — ${reviewTarget?.title}`}>
        {reviewTarget && (
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Department</span><strong>{reviewTarget.department}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Category</span><span>{reviewTarget.category}</span></div>
              {reviewTarget.amount && <div className="flex justify-between"><span className="text-slate-500">Amount</span><strong className="text-emerald-700">₦{reviewTarget.amount.toLocaleString()}</strong></div>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reviewed By</label>
              <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Add review notes..." className={inputCls} />
            </div>
            <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${action === "Approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
              This will mark the request as <strong>{action}</strong> and notify the requesting department.
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setReviewTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleReview}>
            {action === "Approved" ? "Approve Request" : "Reject Request"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
