"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { DB_TO_STAFF_DEPT } from "@/lib/data/hr-store";
import { getCurrentQuarter } from "@/lib/performance/quarters";
import type { PerformanceReview } from "@/lib/performance/types";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-50 text-blue-700",
  acknowledged: "bg-emerald-50 text-emerald-700",
};

function departmentLabel(value: string) {
  return DB_TO_STAFF_DEPT[value] ?? value;
}

export function HrPerformanceOverview() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const currentQuarter = getCurrentQuarter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const currentQuarterReviews = useMemo(
    () => reviews.filter((r) => r.period === currentQuarter.value),
    [reviews, currentQuarter.value],
  );

  const stats = useMemo(() => ({
    total: reviews.length,
    currentQuarter: currentQuarterReviews.length,
    drafts: reviews.filter((r) => r.status === "draft").length,
    awaitingAck: reviews.filter((r) => r.status === "submitted").length,
    acknowledged: reviews.filter((r) => r.status === "acknowledged").length,
    currentQuarterPending: currentQuarterReviews.filter((r) => r.status !== "acknowledged").length,
  }), [reviews, currentQuarterReviews]);

  const allDepts = ["All", ...Array.from(new Set(reviews.map((r) => r.department)))];
  const filtered = reviews.filter((r) => {
    const deptMatch = filterDept === "All" || r.department === filterDept;
    const statusMatch = filterStatus === "All" || r.status === filterStatus;
    return deptMatch && statusMatch;
  });

  const deptLinks = [
    "doctors", "nurses", "pharmacy", "lab", "frontdesk",
    "accounts", "store", "it", "hr",
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Reviews"
        description="Hospital-wide quarterly appraisals — track completion and staff acknowledgments."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Current Quarter", value: currentQuarter.label, sub: `${stats.currentQuarter} review(s)` },
          { label: "Drafts", value: stats.drafts, sub: "Not yet submitted" },
          { label: "Awaiting Acknowledgment", value: stats.awaitingAck, sub: "Submitted to staff" },
          { label: "Acknowledged", value: stats.acknowledged, sub: "Completed cycle" },
          { label: "Quarter Incomplete", value: stats.currentQuarterPending, sub: "Still in progress" },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
            <p className="text-[11px] text-slate-500">{item.sub}</p>
          </Card>
        ))}
      </div>

      {stats.currentQuarterPending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{currentQuarter.periodLabel}:</strong> {stats.currentQuarterPending} review
          {stats.currentQuarterPending !== 1 ? "s" : ""} still in progress for this quarter.
          Due by {currentQuarter.endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
        </div>
      )}

      <Card className="p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Create reviews by department</p>
        <div className="flex flex-wrap gap-2">
          {deptLinks.map((dept) => (
            <Link
              key={dept}
              href={`${INTERNAL_PREFIX}/${dept}/performance`}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100"
            >
              {departmentLabel(dept)}
            </Link>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Reviews</h3>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {(["All", "draft", "submitted", "acknowledged"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status === "All" ? "All" : status)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold capitalize transition",
                    filterStatus === status ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {allDepts.map((d) => (
                <option key={d} value={d}>{d === "All" ? "All departments" : departmentLabel(d)}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">Loading performance reviews...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No performance reviews match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Staff", "Department", "Period", "Rating", "Reviewer", "Status", "Updated"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.staffName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{departmentLabel(r.department)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.periodLabel}</td>
                    <td className="px-4 py-3 font-bold text-amber-600">{r.overallRating ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.reviewerName}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_STYLES[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
