"use client";

import { useCallback, useEffect, useState } from "react";
import type { PerformanceReview } from "@/lib/performance/types";
import { cn } from "@/lib/utils/cn";

const statusChip = (status: string) => {
  const map: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    submitted: "bg-blue-50 text-blue-700 border border-blue-200",
    acknowledged: "bg-green-50 text-green-700 border border-green-200",
  };
  return cn(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
    map[status] ?? "bg-slate-100 text-slate-600",
  );
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          fill={star <= value ? "currentColor" : "none"}
          stroke="currentColor"
          className={cn("h-4 w-4", star <= value ? "text-amber-400" : "text-slate-300")}
        >
          <path
            strokeWidth="1.5"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

export default function StaffPerformancePage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PerformanceReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/performance/reviews?mine=1");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function acknowledge(reviewId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/performance/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action: "acknowledge" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not acknowledge review.");
      }
      setToast("Review acknowledged.");
      setDetail(null);
      await load();
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not acknowledge review.");
    } finally {
      setSaving(false);
    }
  }

  const pendingAck = reviews.filter((r) => r.status === "submitted").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Performance Reviews</h1>
        <p className="mt-1 text-sm text-slate-500">
          View quarterly appraisals from your HOD and acknowledge when you have read them.
        </p>
      </div>

      {pendingAck > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {pendingAck} review{pendingAck !== 1 ? "s" : ""} awaiting your acknowledgment.
        </div>
      )}

      <div className="space-y-2">
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            Loading reviews...
          </div>
        )}
        {!loading && reviews.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
            No performance reviews yet.
          </div>
        )}
        {reviews.map((review) => (
          <button
            key={review.id}
            type="button"
            onClick={() => setDetail(review)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900">{review.periodLabel}</p>
                <p className="text-sm text-slate-500">Reviewed by {review.reviewerName}</p>
                {review.overallRating != null && (
                  <p className="mt-1 text-xs font-semibold text-amber-600">{review.overallRating}/5 overall</p>
                )}
              </div>
              <span className={statusChip(review.status)}>{review.status}</span>
            </div>
          </button>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">{detail.periodLabel}</h3>
                <p className="text-sm text-slate-500">By {detail.reviewerName}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={statusChip(detail.status)}>{detail.status}</span>
                {detail.overallRating != null && (
                  <span className="text-sm font-bold text-amber-600">{detail.overallRating}/5 overall</span>
                )}
              </div>
              {detail.kpiScores.map((kpi) => (
                <div key={kpi.category} className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{kpi.category}</p>
                    <StarRating value={kpi.rating} />
                  </div>
                  {kpi.comment && <p className="mt-1 text-xs text-slate-500">{kpi.comment}</p>}
                </div>
              ))}
              {detail.strengths && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Strengths</p>
                  <p className="text-sm text-slate-700">{detail.strengths}</p>
                </div>
              )}
              {detail.improvements && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Areas for improvement</p>
                  <p className="text-sm text-slate-700">{detail.improvements}</p>
                </div>
              )}
              {detail.comments && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Comments</p>
                  <p className="text-sm text-slate-700">{detail.comments}</p>
                </div>
              )}
            </div>
            {detail.status === "submitted" && (
              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void acknowledge(detail.id)}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Acknowledge Review"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 mx-auto max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
