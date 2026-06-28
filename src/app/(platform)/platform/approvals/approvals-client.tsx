"use client";

import { useState } from "react";
import Link from "next/link";
import { approveSignupRequestAction, rejectSignupRequestAction } from "@/server/actions/platform/approvals";
import { Card, PlanBadge, platformInputClass, platformBtnSuccess, platformBtnOutlineSm, platformBtnDestructive } from "@/components/platform/page-shell";
import type { SignupRequest } from "@/server/actions/platform/approvals";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function RequestCard({
  req,
  onApprove,
  onReject,
  loading,
}: {
  req: SignupRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-800 text-base">{req.hospital_name}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">{req.slug}</p>
        </div>
        <PlanBadge plan={req.plan} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Owner</dt>
          <dd className="text-slate-800">{req.owner_name}</dd>
          <dd className="text-xs text-slate-500">{req.owner_email}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Contact</dt>
          <dd className="text-slate-800">{req.contact_email}</dd>
          {req.contact_phone && <dd className="text-xs text-slate-500">{req.contact_phone}</dd>}
        </div>
        {req.address && (
          <div className="col-span-2">
            <dt className="text-xs text-slate-500">Address</dt>
            <dd className="text-slate-800">{req.address}</dd>
          </div>
        )}
      </dl>

      <p className="text-xs text-slate-400">Submitted {formatDate(req.created_at)}</p>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={loading}
          onClick={() => onApprove(req.id)}
          className={`${platformBtnSuccess} flex-1`}
        >
          {loading ? "Processing…" : "Approve & provision"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onReject(req.id)}
          className={platformBtnOutlineSm}
        >
          Reject
        </button>
      </div>
    </Card>
  );
}

export function ApprovalsClient({
  pending: initialPending,
  recentlyApproved,
}: {
  pending: SignupRequest[];
  recentlyApproved: SignupRequest[];
}) {
  const [pending, setPending] = useState(initialPending);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provisionedCreds, setProvisionedCreds] = useState<{
    hospitalId: string;
    ownerEmail: string;
    tempPassword: string;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function handleApprove(id: string) {
    if (!confirm("Approve this hospital? This will create the hospital and provision the owner's admin account.")) return;
    setLoadingId(id);
    setError(null);
    setProvisionedCreds(null);
    const result = await approveSignupRequestAction(id);
    setLoadingId(null);
    if (!result.success) { setError(result.error); return; }
    setPending((prev) => prev.filter((r) => r.id !== id));
    setProvisionedCreds(result.data);
  }

  async function handleReject(id: string) {
    setRejectTarget(id);
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setLoadingId(rejectTarget);
    setError(null);
    const result = await rejectSignupRequestAction(rejectTarget, rejectReason || undefined);
    setLoadingId(null);
    if (!result.success) { setError(result.error); return; }
    setPending((prev) => prev.filter((r) => r.id !== rejectTarget));
    setRejectTarget(null);
    setRejectReason("");
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {provisionedCreds && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
          <p className="font-semibold text-emerald-800">Hospital approved and provisioned!</p>
          <p className="text-sm text-emerald-700">
            Owner email: <span className="font-mono">{provisionedCreds.ownerEmail}</span>
          </p>
          <div>
            <p className="text-sm text-emerald-700">Temporary password — share with the owner:</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-900 select-all">{provisionedCreds.tempPassword}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              href={`/platform/hospitals/${provisionedCreds.hospitalId}`}
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              View hospital →
            </Link>
            <button
              type="button"
              onClick={() => setProvisionedCreds(null)}
              className="text-sm text-emerald-600 hover:text-emerald-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Reject this request?</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700">Reason (optional)</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete information, duplicate submission…"
                className={`${platformInputClass} resize-none`}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className={platformBtnOutlineSm}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!loadingId}
                onClick={confirmReject}
                className={platformBtnDestructive}
              >
                Confirm rejection
              </button>
            </div>
          </Card>
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Pending requests</h2>
          {pending.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <Card className="px-5 py-10 text-center">
            <p className="text-slate-600">No pending requests.</p>
            <p className="mt-1 text-sm text-slate-500">
              New hospital signups will appear here for review.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={loadingId === req.id}
              />
            ))}
          </div>
        )}
      </section>

      {recentlyApproved.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Recently approved</h2>
          <Card className="divide-y divide-slate-100">
            {recentlyApproved.map((req) => (
              <div key={req.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{req.hospital_name}</p>
                  <p className="text-xs text-slate-500">{req.owner_email} · {formatDate(req.created_at)}</p>
                </div>
                {req.hospital_id && (
                  <Link
                    href={`/platform/hospitals/${req.hospital_id}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View →
                  </Link>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
