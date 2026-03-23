"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  fetchLeaveRequestsByDept,
  reviewLeaveRequestByHOD,
} from "@/lib/supabase/db";
import { DB_TO_STAFF_DEPT } from "@/lib/data/hr-store";
import type { LeaveRequest } from "@/lib/data/hr-store";
import { cn } from "@/lib/utils/cn";
import type { DBDepartmentKey } from "@/lib/constants/navigation";

type FilterTab = "All" | "Pending" | "Approved" | "Rejected";

const ALLOWED_ROLES = ["hod", "hr_manager", "hr_staff", "admin"];

export function HodLeavePage({ department }: { department: DBDepartmentKey }) {
  const session = useHMSSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<FilterTab>("Pending");
  const [toast, setToast]       = useState<ToastData | null>(null);

  // Review modal state
  const [reviewing, setReviewing]   = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approved" | "Rejected">("Approved");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchLeaveRequestsByDept(department);
    setRequests(data);
    setLoading(false);
  }, [department]);

  useEffect(() => { void load(); }, [load]);

  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Restricted</p>
          <p className="mt-1 text-sm text-slate-400">Only HODs and HR staff can manage leave requests.</p>
        </div>
      </div>
    );
  }

  const filtered = tab === "All" ? requests : requests.filter((r) => r.status === tab);
  const counts = {
    Pending:  requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
    Rejected: requests.filter((r) => r.status === "Rejected").length,
  };
  const departmentLabel = DB_TO_STAFF_DEPT[department] ?? department;

  async function handleReview() {
    if (!reviewing || !session) return;
    setSaving(true);
    try {
      await reviewLeaveRequestByHOD(reviewing.id, reviewAction, session.full_name, reviewNote);
      setToast({ type: "success", message: `Leave request ${reviewAction.toLowerCase()} successfully.` });
      await load();
    } catch {
      setToast({ type: "error", message: "Failed to update leave request." });
    } finally {
      setSaving(false);
      setReviewing(null);
      setReviewNote("");
    }
  }

  const statusChip = (status: string) => {
    const map: Record<string, string> = {
      Pending:  "bg-amber-50 text-amber-700 border border-amber-200",
      Approved: "bg-green-50 text-green-700 border border-green-200",
      Rejected: "bg-red-50 text-red-700 border border-red-200",
    };
    return cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", map[status] ?? "bg-slate-100 text-slate-600");
  };

  function MobileMeta({ label, value }: { label: string; value: string | number }) {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <PageHeader title="Leave Requests" description={`Review and manage leave for ${departmentLabel}.`} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["All", "Pending", "Approved", "Rejected"] as FilterTab[]).map((t) => {
          const count = t === "All" ? requests.length : counts[t as keyof typeof counts];
          const color = t === "Pending" ? "text-amber-600" : t === "Approved" ? "text-green-600" : t === "Rejected" ? "text-red-600" : "text-slate-700";
          return (
            <Card key={t}>
              <div className="px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t}</p>
                <p className={cn("mt-1 text-2xl font-bold", color)}>{count}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {(["All", "Pending", "Approved", "Rejected"] as FilterTab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === t ? "bg-white text-[var(--accent)] shadow-sm" : "text-slate-500 hover:text-slate-700")}>
            {t}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No {tab.toLowerCase()} leave requests.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((r) => (
                <div key={r.id} className="space-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.staffName}</p>
                      <p className="text-xs text-slate-400">{r.role}</p>
                    </div>
                    <span className={statusChip(r.status)}>{r.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MobileMeta label="Leave Type" value={r.leaveType} />
                    <MobileMeta label="Days" value={`${r.days}d`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <MobileMeta
                      label="Dates"
                      value={`${new Date(r.startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(
                        r.endDate + "T00:00:00",
                      ).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    />
                    <MobileMeta
                      label="Submitted"
                      value={r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                    />
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{r.reason}</div>
                  {r.status !== "Pending" && r.hrNotes && <p className="text-xs italic text-slate-400">{r.hrNotes}</p>}
                  {r.status === "Pending" && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setReviewing(r); setReviewAction("Approved"); setReviewNote(""); }}
                        className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReviewing(r); setReviewAction("Rejected"); setReviewNote(""); }}
                        className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  {["Staff", "Leave Type", "Dates", "Days", "Reason", "Submitted", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{r.staffName}</p>
                      <p className="text-xs text-slate-400">{r.role}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.leaveType}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {new Date(r.startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(r.endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.days}d</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-slate-600">{r.reason}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                    </td>
                    <td className="px-4 py-3"><span className={statusChip(r.status)}>{r.status}</span></td>
                    <td className="px-4 py-3">
                      {r.status === "Pending" && (
                        <div className="flex gap-1.5">
                          <button type="button"
                            onClick={() => { setReviewing(r); setReviewAction("Approved"); setReviewNote(""); }}
                            className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition">
                            Approve
                          </button>
                          <button type="button"
                            onClick={() => { setReviewing(r); setReviewAction("Rejected"); setReviewNote(""); }}
                            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition">
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status !== "Pending" && r.hrNotes && (
                        <span className="text-xs text-slate-400 italic">{r.hrNotes}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </Card>

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">
                {reviewAction === "Approved" ? "Approve" : "Reject"} Leave Request
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                {reviewing.staffName} · {reviewing.leaveType} · {reviewing.days} day(s)
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {reviewAction === "Approved" ? "Notes (optional)" : "Reason for rejection *"}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder={reviewAction === "Approved" ? "Any notes for the staff member…" : "State reason for rejection…"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <Button size="md" onClick={() => setReviewing(null)}>Cancel</Button>
              <button type="button" disabled={saving || (reviewAction === "Rejected" && !reviewNote.trim())}
                onClick={() => void handleReview()}
                className={cn("rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40",
                  reviewAction === "Approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}>
                {saving ? "Saving…" : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
