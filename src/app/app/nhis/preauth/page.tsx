"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import {
  fetchHmoPreauthorizations,
  fmtNaira,
  reviewHmoPreauthorizationApi,
} from "@/lib/nhis/client";
import type { HmoPreAuthorization } from "@/modules/nhis/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  denied: "bg-red-50 text-red-700",
  expired: "bg-slate-100 text-slate-600",
  used: "bg-blue-50 text-blue-700",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NhisPreauthPage() {
  const [preauths, setPreauths] = useState<HmoPreAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [reviewTarget, setReviewTarget] = useState<HmoPreAuthorization | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setPreauths(await fetchHmoPreauthorizations({ status: statusFilter || undefined }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  function openReview(row: HmoPreAuthorization) {
    setReviewTarget(row);
    setAuthCode("");
    setValidUntil("");
    setReviewNotes("");
    setError(null);
  }

  async function handleReview(action: "approve" | "deny") {
    if (!reviewTarget) return;
    if (action === "approve" && !authCode.trim()) {
      setError("Authorization code is required for approval.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await reviewHmoPreauthorizationApi(reviewTarget.id, {
        action,
        authCode: authCode.trim() || undefined,
        validUntil: validUntil || undefined,
        notes: reviewNotes.trim() || undefined,
      });
      setToast({
        message: action === "approve" ? "Pre-authorization approved." : "Pre-authorization denied.",
        type: "success",
      });
      setReviewTarget(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Review failed.";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = preauths.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="HMO Pre-authorizations"
        description="Review admission and procedure requests from clinical staff before HMO pricing applies."
      />

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}

      <div className="flex flex-wrap gap-2">
        {["pending", "approved", "denied", ""].map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              statusFilter === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {value === "" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
            {value === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Pre-authorization queue</h3>
          <p className="text-xs text-slate-500">
            Admissions and procedures require approval before HMO tariff auto-applies on charges.
          </p>
        </div>
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-400">Loading…</p>
        ) : preauths.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No pre-authorizations in this filter.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {preauths.map((row) => (
              <div key={row.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`${INTERNAL_PREFIX}/nhis/patients`}
                        className="font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {row.patientName}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {row.status}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                        {row.serviceCategory}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{row.serviceName}</p>
                    <p className="text-xs text-slate-500">
                      {row.schemeName ?? "HMO"} · Requested by {row.requestedByName} · {formatDate(row.createdAt)}
                    </p>
                    {row.amountCap != null ? (
                      <p className="text-xs text-slate-400">Cap: {fmtNaira(row.amountCap)}</p>
                    ) : null}
                    {row.authCode ? (
                      <p className="text-xs font-mono text-emerald-700">Auth: {row.authCode}</p>
                    ) : null}
                    {row.notes ? <p className="mt-1 text-xs text-slate-500">{row.notes}</p> : null}
                  </div>
                  {row.status === "pending" ? (
                    <Button size="sm" onClick={() => openReview(row)}>
                      Review
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {reviewTarget ? (
        <Modal open title={`Review — ${reviewTarget.patientName}`} onClose={() => setReviewTarget(null)}>
          <div className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            <p className="text-sm text-slate-600">
              {reviewTarget.serviceCategory} · {reviewTarget.serviceName}
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Authorization code *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="HMO auth reference"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Valid until</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>Cancel</Button>
            <Button variant="outline" className="text-red-600" disabled={saving} onClick={() => void handleReview("deny")}>
              Deny
            </Button>
            <Button disabled={saving} onClick={() => void handleReview("approve")}>
              {saving ? "Saving…" : "Approve"}
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}
