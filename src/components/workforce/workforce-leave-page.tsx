"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useHMSSession } from "@/modules/rbac/hooks";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import { canReviewWorkforceLeave, isWorkforceAdmin } from "@/lib/workforce/access";
import type { LeaveRequest } from "@/lib/data/hr-store";

type FilterTab = "All" | "Pending" | "Approved" | "Rejected";

export function WorkforceLeavePage() {
  const session = useHMSSession();
  const [unitName, setUnitName] = useState<string | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("Pending");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reviewing, setReviewing] = useState<LeaveRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approved" | "Rejected">("Approved");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      if (!isWorkforceAdmin(session)) {
        const unit = await fetchMyNcUnit(session.staff_id);
        setUnitName(unit);
      }
    })();
  }, [session]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ department: "non_clinical" });
      if (unitName && !isWorkforceAdmin(session!)) params.set("unitName", unitName);
      const res = await fetch(`/api/leave/requests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [session, unitName]);

  useEffect(() => { if (session) void load(); }, [load, session]);

  if (!session || !canReviewWorkforceLeave(session)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Access Restricted</p>
          <p className="mt-1 text-sm text-slate-400">Leave approval is available to unit heads, HR, and Admin.</p>
        </div>
      </div>
    );
  }

  async function submitReview() {
    if (!reviewing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/leave/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reviewing.id,
          status: reviewAction,
          hrNotes: reviewNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Review failed");
      setToast({ message: `Leave ${reviewAction.toLowerCase()} for ${reviewing.staffName}.`, type: "success" });
      setReviewing(null);
      setReviewNote("");
      await load();
    } catch {
      setToast({ message: "Could not update leave request.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const filtered = tab === "All" ? requests : requests.filter((r) => r.status === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description={unitName ? `Review leave requests for ${unitName}.` : "Review non-clinical leave requests across all units."}
      />

      <div className="flex flex-wrap gap-2">
        {(["All", "Pending", "Approved", "Rejected"] as FilterTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-[var(--accent)] text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                {["Staff", "Type", "Duration", "Dates", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{r.staffName}</td>
                  <td className="px-5 py-3">{r.leaveType}</td>
                  <td className="px-5 py-3">{r.days} day(s)</td>
                  <td className="px-5 py-3 text-slate-600">{r.startDate} → {r.endDate}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">{r.status}</span></td>
                  <td className="px-5 py-3">
                    {r.status === "Pending" ? (
                      <Button size="sm" onClick={() => { setReviewing(r); setReviewAction("Approved"); }}>Review</Button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No leave requests in this view.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title="Review Leave Request">
        {reviewing ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{reviewing.staffName} — {reviewing.leaveType} ({reviewing.days} days)</p>
            <div className="flex gap-2">
              {(["Approved", "Rejected"] as const).map((action) => (
                <button key={action} type="button" onClick={() => setReviewAction(action)} className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${reviewAction === action ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-slate-200"}`}>{action}</button>
              ))}
            </div>
            <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional note…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        ) : null}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setReviewing(null)}>Cancel</Button>
          <Button disabled={saving} onClick={submitReview}>{saving ? "Saving…" : "Confirm"}</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
