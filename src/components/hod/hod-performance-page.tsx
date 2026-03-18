"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { STAFF_DEPT_TO_DB } from "@/lib/data/hr-store";
import {
  fetchReviewsByDept,
  upsertPerformanceReview,
  type KpiScore,
  type PerformanceReview,
} from "@/lib/supabase/db";
import { cn } from "@/lib/utils/cn";
import type { DBDepartmentKey } from "@/lib/constants/navigation";

const ALLOWED_ROLES = ["hod", "hr_manager", "hr_staff", "admin"];

const DEFAULT_KPI_CATEGORIES = [
  "Clinical / Technical Knowledge",
  "Teamwork & Collaboration",
  "Punctuality & Attendance",
  "Communication",
  "Initiative & Problem Solving",
];

function getQuarters(): { value: string; label: string; periodLabel: string }[] {
  const now = new Date();
  const year = now.getFullYear();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  const months = ["January – March", "April – June", "July – September", "October – December"];
  const result = [];
  for (let i = 0; i < 4; i++) {
    let qn = q - i; let yr = year;
    if (qn <= 0) { qn += 4; yr--; }
    result.push({
      value: `Q${qn}-${yr}`,
      label: `Q${qn} ${yr} (${months[qn - 1]})`,
      periodLabel: `${months[qn - 1]} ${yr}`,
    });
  }
  return result;
}

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn("h-5 w-5 transition", readonly ? "cursor-default" : "hover:scale-110")}>
          <svg viewBox="0 0 20 20" fill={star <= value ? "currentColor" : "none"} stroke="currentColor"
            className={cn("h-5 w-5", star <= value ? "text-amber-400" : "text-slate-300")}>
            <path strokeWidth="1.5" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const statusChip = (status: string) => {
  const map: Record<string, string> = {
    draft:        "bg-slate-100 text-slate-600",
    submitted:    "bg-blue-50 text-blue-700 border border-blue-200",
    acknowledged: "bg-green-50 text-green-700 border border-green-200",
  };
  return cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", map[status] ?? "bg-slate-100 text-slate-600");
};

export function HodPerformancePage({ department }: { department: DBDepartmentKey }) {
  const session   = useHMSSession();
  const { staff } = useHRStore();

  const [view, setView]         = useState<"list" | "new">("list");
  const [reviews, setReviews]   = useState<PerformanceReview[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<ToastData | null>(null);
  const [detailReview, setDetailReview] = useState<PerformanceReview | null>(null);

  // Form state
  const quarters = getQuarters();
  const [selStaffId, setSelStaffId] = useState("");
  const [selPeriod, setSelPeriod]   = useState(quarters[0].value);
  const [kpiScores, setKpiScores]   = useState<KpiScore[]>(
    DEFAULT_KPI_CATEGORIES.map((c) => ({ category: c, rating: 0, comment: "" })),
  );
  const [strengths, setStrengths]       = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments]         = useState("");
  const [editingId, setEditingId]       = useState<string | undefined>();

  // staff.department is a display label e.g. "Pharmacy" — map to DB key to compare
  const deptStaff = staff.filter((s) => {
    const dbKey = STAFF_DEPT_TO_DB[s.department as keyof typeof STAFF_DEPT_TO_DB];
    return dbKey === department;
  });

  const overallRating = kpiScores.every((k) => k.rating === 0)
    ? null
    : Math.round((kpiScores.reduce((sum, k) => sum + k.rating, 0) / kpiScores.filter((k) => k.rating > 0).length) * 10) / 10;

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchReviewsByDept(department);
    setReviews(data);
    setLoading(false);
  }, [department]);

  useEffect(() => { void load(); }, [load]);

  function resetForm() {
    setSelStaffId("");
    setSelPeriod(quarters[0].value);
    setKpiScores(DEFAULT_KPI_CATEGORIES.map((c) => ({ category: c, rating: 0, comment: "" })));
    setStrengths(""); setImprovements(""); setComments("");
    setEditingId(undefined);
  }

  function loadForEdit(r: PerformanceReview) {
    setSelStaffId(r.staffId);
    setSelPeriod(r.period);
    setKpiScores(r.kpiScores.length > 0 ? r.kpiScores : DEFAULT_KPI_CATEGORIES.map((c) => ({ category: c, rating: 0, comment: "" })));
    setStrengths(r.strengths);
    setImprovements(r.improvements);
    setComments(r.comments);
    setEditingId(r.id);
    setView("new");
  }

  async function handleSave(submitNow: boolean) {
    if (!session || !selStaffId) return;
    const selectedStaff = staff.find((s) => s.id === selStaffId);
    if (!selectedStaff) return;
    const quarter = quarters.find((q) => q.value === selPeriod);
    setSaving(true);
    try {
      await upsertPerformanceReview({
        id: editingId,
        staffId: selStaffId,
        staffName: selectedStaff.name,
        department,
        reviewerId: session.staff_id,
        reviewerName: session.full_name,
        period: selPeriod,
        periodLabel: quarter?.periodLabel ?? selPeriod,
        kpiScores,
        overallRating,
        strengths,
        improvements,
        comments,
        status: submitNow ? "submitted" : "draft",
        submittedAt: submitNow ? new Date().toISOString() : null,
        acknowledgedAt: null,
      });
      setToast({ type: "success", message: submitNow ? "Review submitted." : "Draft saved." });
      resetForm();
      setView("list");
      await load();
    } catch {
      setToast({ type: "error", message: "Failed to save review." });
    } finally {
      setSaving(false);
    }
  }

  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Restricted</p>
          <p className="mt-1 text-sm text-slate-400">Only HODs and HR staff can manage performance reviews.</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <div className="space-y-6">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <PageHeader title="Staff Performance" description="Quarterly appraisal reviews for your department." />

      {/* View tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
          {(["list", "new"] as const).map((v) => (
            <button key={v} type="button"
              onClick={() => { setView(v); if (v === "new") resetForm(); }}
              className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition",
                view === v ? "bg-white text-[var(--accent)] shadow-sm" : "text-slate-500 hover:text-slate-700")}>
              {v === "list" ? "All Reviews" : "+ New Review"}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-400">{reviews.length} total review{reviews.length !== 1 ? "s" : ""}</p>
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No reviews yet.{" "}
              <button type="button" onClick={() => setView("new")} className="text-[var(--accent)] underline">
                Create the first one
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50">
                    {["Staff", "Period", "Rating", "Status", "Reviewer", "Date", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setDetailReview(r)}>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.staffName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{r.periodLabel}</td>
                      <td className="px-4 py-3">
                        {r.overallRating != null ? (
                          <span className="text-sm font-bold text-amber-600">{r.overallRating}/5</span>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3"><span className={statusChip(r.status)}>{r.status}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500">{r.reviewerName}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {r.status === "draft" && (
                          <button type="button" onClick={() => loadForEdit(r)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── NEW / EDIT REVIEW FORM ── */}
      {view === "new" && (
        <div className="space-y-5">
          <Card>
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">Review Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Member *</label>
                  <select value={selStaffId} onChange={(e) => setSelStaffId(e.target.value)} className={inputCls}>
                    <option value="">Select staff member…</option>
                    {deptStaff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Review Period *</label>
                  <select value={selPeriod} onChange={(e) => setSelPeriod(e.target.value)} className={inputCls}>
                    {quarters.map((q) => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">KPI Scores</h3>
                {overallRating != null && (
                  <div className="flex items-center gap-2">
                    <StarRating value={Math.round(overallRating)} readonly />
                    <span className="text-sm font-bold text-amber-600">{overallRating} / 5 overall</span>
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {kpiScores.map((kpi, i) => (
                  <div key={kpi.category} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{kpi.category}</p>
                      <StarRating value={kpi.rating} onChange={(v) => {
                        setKpiScores((prev) => prev.map((k, idx) => idx === i ? { ...k, rating: v } : k));
                      }} />
                    </div>
                    <input
                      type="text"
                      value={kpi.comment}
                      onChange={(e) => setKpiScores((prev) => prev.map((k, idx) => idx === i ? { ...k, comment: e.target.value } : k))}
                      placeholder="Brief comment on this KPI…"
                      className={cn(inputCls, "text-xs")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">Summary</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Key Strengths</label>
                <textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2}
                  placeholder="What does this staff member do particularly well?" className={cn(inputCls, "resize-none")} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Areas for Improvement</label>
                <textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={2}
                  placeholder="What should they focus on improving?" className={cn(inputCls, "resize-none")} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">General Comments</label>
                <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2}
                  placeholder="Any additional notes or context…" className={cn(inputCls, "resize-none")} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button size="md" onClick={() => { resetForm(); setView("list"); }}>Cancel</Button>
            <button type="button" disabled={saving || !selStaffId}
              onClick={() => void handleSave(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40">
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button type="button" disabled={saving || !selStaffId || overallRating === null}
              onClick={() => void handleSave(true)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40">
              {saving ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">{detailReview.staffName}</h3>
                <p className="text-sm text-slate-500">{detailReview.periodLabel} · by {detailReview.reviewerName}</p>
              </div>
              <button type="button" onClick={() => setDetailReview(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className={statusChip(detailReview.status)}>{detailReview.status}</span>
                {detailReview.overallRating != null && (
                  <span className="text-sm font-bold text-amber-600">{detailReview.overallRating} / 5 overall</span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {detailReview.kpiScores.map((kpi) => (
                  <div key={kpi.category} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{kpi.category}</p>
                      <StarRating value={kpi.rating} readonly />
                    </div>
                    {kpi.comment && <p className="text-xs text-slate-500">{kpi.comment}</p>}
                  </div>
                ))}
              </div>
              {detailReview.strengths && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Strengths</p>
                  <p className="text-sm text-slate-700">{detailReview.strengths}</p>
                </div>
              )}
              {detailReview.improvements && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Areas for Improvement</p>
                  <p className="text-sm text-slate-700">{detailReview.improvements}</p>
                </div>
              )}
              {detailReview.comments && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Comments</p>
                  <p className="text-sm text-slate-700">{detailReview.comments}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
