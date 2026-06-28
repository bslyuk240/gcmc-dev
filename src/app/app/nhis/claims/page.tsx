"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import {
  buildHmoClaimApi,
  fetchUnclaimedHmoCharges,
  transitionHmoClaimApi,
} from "@/lib/nhis/client";
import type { UnclaimedHmoCharge } from "@/modules/nhis/types";
import { type HmoClaim } from "@/lib/data/nhis-store";

type ClaimTab = "draft" | "submitted" | "approved" | "rejected" | "paid";

const TABS: ClaimTab[] = ["draft", "submitted", "approved", "rejected", "paid"];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  paid: "bg-emerald-50 text-emerald-700",
  partial: "bg-amber-50 text-amber-700",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MobileMeta({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function NhisClaimsPage() {
  const { enrollments, claims, hydrated, reload } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeTab, setActiveTab] = useState<ClaimTab>("draft");

  const [showNewClaim, setShowNewClaim] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [newClaimNotes, setNewClaimNotes] = useState("");
  const [unclaimedCharges, setUnclaimedCharges] = useState<UnclaimedHmoCharge[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
  const [loadingCharges, setLoadingCharges] = useState(false);

  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId) ?? null;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status action modals
  const [rejectTarget, setRejectTarget] = useState<HmoClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [payTarget, setPayTarget] = useState<HmoClaim | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    if (!selectedEnrollment) {
      setUnclaimedCharges([]);
      setSelectedChargeIds(new Set());
      return;
    }
    setLoadingCharges(true);
    fetchUnclaimedHmoCharges(selectedEnrollment.patientDisplayId || selectedEnrollment.patientId)
      .then((charges) => {
        setUnclaimedCharges(charges);
        setSelectedChargeIds(new Set());
      })
      .catch(() => setUnclaimedCharges([]))
      .finally(() => setLoadingCharges(false));
  }, [selectedEnrollment]);

  const tabClaims = claims.filter((c) => c.status === activeTab);

  const tabReceivables = (["submitted", "approved", "partial"] as const).includes(activeTab as "submitted" | "approved" | "partial")
    ? tabClaims.reduce((sum, c) => sum + c.hmoAmount, 0)
    : null;

  // ── New claim from charge lines ───────────────────────────────────────────

  const selectedCharges = unclaimedCharges.filter((c) => selectedChargeIds.has(c.id));
  const totals = selectedCharges.reduce(
    (acc, c) => ({
      totalCost: acc.totalCost + c.totalAmount,
      hmoAmount: acc.hmoAmount + (c.hmoAmount ?? 0),
      copayAmount: acc.copayAmount + (c.copayAmount ?? 0),
    }),
    { totalCost: 0, hmoAmount: 0, copayAmount: 0 },
  );

  function toggleCharge(id: string) {
    setSelectedChargeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveDraft() {
    if (!selectedEnrollmentId || !selectedEnrollment) {
      setFormError("Please select an enrolled patient.");
      return;
    }
    if (selectedChargeIds.size === 0) {
      setFormError("Select at least one HMO charge line with copay collected.");
      return;
    }
    const notReady = selectedCharges.filter((c) => !c.copayCollected);
    if (notReady.length) {
      setFormError(`${notReady.length} selected charge(s) still need copay collection at Accounts.`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const result = await buildHmoClaimApi({
        patientRef: selectedEnrollment.patientDisplayId || selectedEnrollment.patientId,
        enrollmentId: selectedEnrollment.id,
        chargeLineIds: Array.from(selectedChargeIds),
        notes: newClaimNotes.trim() || undefined,
      });

      setToast({ message: `Claim ${result.claimNumber} created as draft.`, type: "success" });
      setShowNewClaim(false);
      setSelectedEnrollmentId("");
      setNewClaimNotes("");
      setSelectedChargeIds(new Set());
      setActiveTab("draft");
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setFormError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // ── Submit to HMO ──────────────────────────────────────────────────────────

  async function handleSubmit(claim: HmoClaim) {
    setActionSaving(true);
    try {
      await transitionHmoClaimApi(claim.id, { action: "submit" });
      setToast({ message: `Claim ${claim.claimNumber} submitted to HMO.`, type: "success" });
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit claim";
      setToast({ message: msg, type: "error" });
    } finally {
      setActionSaving(false);
    }
  }

  async function handleApprove(claim: HmoClaim) {
    setActionSaving(true);
    try {
      await transitionHmoClaimApi(claim.id, { action: "approve" });
      setToast({ message: `Claim ${claim.claimNumber} marked as approved.`, type: "success" });
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve claim";
      setToast({ message: msg, type: "error" });
    } finally {
      setActionSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) return;
    setActionSaving(true);
    try {
      await transitionHmoClaimApi(rejectTarget.id, {
        action: "reject",
        rejectionReason: rejectionReason.trim(),
      });
      setToast({ message: `Claim ${rejectTarget.claimNumber} rejected.`, type: "info" });
      setRejectTarget(null);
      setRejectionReason("");
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reject claim";
      setToast({ message: msg, type: "error" });
    } finally {
      setActionSaving(false);
    }
  }

  async function handleRecordPayment() {
    if (!payTarget) return;
    const paid = parseFloat(amountPaid);
    if (isNaN(paid) || paid <= 0) {
      setToast({ message: "Please enter a valid payment amount.", type: "error" });
      return;
    }
    setActionSaving(true);
    try {
      const isPartial = paid < payTarget.hmoAmount;
      await transitionHmoClaimApi(payTarget.id, {
        action: isPartial ? "mark_partial" : "mark_paid",
        amountPaid: paid,
      });
      setToast({ message: `Payment of ${fmt(paid)} recorded for claim ${payTarget.claimNumber}.`, type: "success" });
      setPayTarget(null);
      setAmountPaid("");
      await reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      setToast({ message: msg, type: "error" });
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Claims"
        description="Manage HMO claims from draft through to payment."
      />

      {<Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                activeTab === tab ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab} ({claims.filter((c) => c.status === tab).length})
            </button>
          ))}
        </div>
        <Button onClick={() => setShowNewClaim(true)}>+ New Claim</Button>
      </div>

      {/* Summary bar */}
      {tabReceivables !== null && (
        <Card className="flex items-center gap-4 px-5 py-3">
          <p className="text-sm text-slate-600">
            Total HMO receivables in this tab:{" "}
            <span className="font-bold text-emerald-700">{fmt(tabReceivables)}</span>
          </p>
        </Card>
      )}

      {/* Claims table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900 capitalize">{activeTab} Claims</h3>
        </div>
        {!hydrated ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : (
          <>
          <div className="grid gap-3 p-3 md:hidden">
            {tabClaims.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                No {activeTab} claims.
              </div>
            ) : (
              tabClaims.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{c.patientName || c.patientId}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">{c.claimNumber || "—"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <MobileMeta label="Scheme" value={c.schemeName} />
                    <MobileMeta label="Services" value={String(c.services.length)} />
                    <MobileMeta label="Total Cost" value={fmt(c.totalCost)} />
                    <MobileMeta label="HMO Amount" value={fmt(c.hmoAmount)} />
                    <MobileMeta label="Copay" value={fmt(c.copayAmount)} />
                    <MobileMeta label="Date" value={formatDate(c.createdAt)} />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {c.status === "draft" && (
                      <Button size="sm" disabled={actionSaving} onClick={() => handleSubmit(c)}>
                        Submit to HMO
                      </Button>
                    )}
                    {c.status === "submitted" && (
                      <>
                        <Button size="sm" disabled={actionSaving} onClick={() => handleApprove(c)}>
                          Mark Approved
                        </Button>
                        <Button size="sm" variant="ghost" disabled={actionSaving} onClick={() => { setRejectTarget(c); setRejectionReason(""); }}>
                          Mark Rejected
                        </Button>
                      </>
                    )}
                    {(c.status === "approved" || c.status === "partial") && (
                      <Button size="sm" disabled={actionSaving} onClick={() => { setPayTarget(c); setAmountPaid(String(c.hmoAmount)); }}>
                        Record Payment
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Claim No.", "Patient", "Scheme", "Services", "Total Cost", "Copay", "HMO Amount", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabClaims.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">
                      No {activeTab} claims.
                    </td>
                  </tr>
                ) : (
                  tabClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{c.claimNumber || "—"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.patientName || c.patientId}</td>
                      <td className="px-4 py-3 text-slate-600">{c.schemeName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.services.length}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{fmt(c.totalCost)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmt(c.copayAmount)}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">{fmt(c.hmoAmount)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {c.status === "draft" && (
                            <Button size="sm" disabled={actionSaving} onClick={() => handleSubmit(c)}>
                              Submit to HMO
                            </Button>
                          )}
                          {c.status === "submitted" && (
                            <>
                              <Button size="sm" disabled={actionSaving} onClick={() => handleApprove(c)}>
                                Mark Approved
                              </Button>
                              <Button size="sm" variant="ghost" disabled={actionSaving} onClick={() => { setRejectTarget(c); setRejectionReason(""); }}>
                                Mark Rejected
                              </Button>
                            </>
                          )}
                          {(c.status === "approved" || c.status === "partial") && (
                            <Button size="sm" disabled={actionSaving} onClick={() => { setPayTarget(c); setAmountPaid(String(c.hmoAmount)); }}>
                              Record Payment
                            </Button>
                          )}
                          {c.status === "rejected" && c.rejectionReason && (
                            <span className="text-xs text-red-600 italic">{c.rejectionReason}</span>
                          )}
                          {c.status === "paid" && c.amountPaid !== undefined && (
                            <span className="text-xs text-emerald-700 font-semibold">{fmt(c.amountPaid)} paid</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {/* New Claim Modal */}
      {showNewClaim && (
        <Modal open={showNewClaim} title="New HMO Claim" onClose={() => setShowNewClaim(false)}>
          <div className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Enrolled Patient *</label>
              <SearchableSelect
                value={selectedEnrollmentId}
                onChange={setSelectedEnrollmentId}
                placeholder="— Search by name, patient ID, or scheme —"
                options={enrollments
                  .filter((e) => e.isActive && e.verificationStatus === "verified")
                  .map((e) => ({
                    value: e.id,
                    label: e.patientName,
                    sublabel: `${e.patientDisplayId || e.patientId} · ${e.schemeName}`,
                  }))}
              />

              {/* Selected enrollment info card */}
              {selectedEnrollment && (
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 space-y-0.5">
                  <p><span className="font-semibold">Scheme:</span> {selectedEnrollment.schemeName}</p>
                  <p><span className="font-semibold">Member ID:</span> {selectedEnrollment.memberId}</p>
                  <p><span className="font-semibold">Copay:</span> {selectedEnrollment.copayPercentage}%</p>
                  {selectedEnrollment.validUntil && (
                    <p><span className="font-semibold">Valid until:</span> {selectedEnrollment.validUntil}</p>
                  )}
                </div>
              )}
            </div>

            {/* Unclaimed HMO charge lines */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Billable charge lines (copay must be collected first) *
              </label>
              {loadingCharges ? (
                <p className="text-sm text-slate-400">Loading charge lines…</p>
              ) : !selectedEnrollment ? (
                <p className="text-sm text-slate-400">Select a patient to load their HMO charges.</p>
              ) : unclaimedCharges.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No unclaimed HMO charges. HMO pricing auto-applies on verified enrollments; use Cash Desk “Retry HMO” if a line was missed.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {unclaimedCharges.map((charge) => (
                    <label
                      key={charge.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-xs ${
                        selectedChargeIds.has(charge.id) ? "border-accent bg-accent/5" : "border-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedChargeIds.has(charge.id)}
                        onChange={() => toggleCharge(charge.id)}
                        disabled={!charge.copayCollected}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{charge.description}</p>
                        <p className="text-slate-500">{charge.department} · {formatDate(charge.billableAt)}</p>
                        <p className="mt-1">
                          Copay {fmt(charge.copayAmount ?? 0)} · HMO {fmt(charge.hmoAmount ?? 0)}
                          {!charge.copayCollected && (
                            <span className="ml-2 font-semibold text-amber-600">Copay pending</span>
                          )}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Total Cost</p>
                  <p className="font-bold text-slate-900">{fmt(totals.totalCost)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Copay</p>
                  <p className="font-bold text-amber-700">{fmt(totals.copayAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">HMO Amount</p>
                  <p className="font-bold text-blue-700">{fmt(totals.hmoAmount)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={2}
                value={newClaimNotes}
                onChange={(e) => setNewClaimNotes(e.target.value)}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowNewClaim(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveDraft} disabled={saving}>
              {saving ? "Saving…" : "Save as Draft"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <Modal open={!!rejectTarget} title="Reject Claim" onClose={() => setRejectTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              You are rejecting claim <strong>{rejectTarget.claimNumber}</strong> for {rejectTarget.patientName}.
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Rejection Reason *</label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection…"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={actionSaving}>Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={actionSaving || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionSaving ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Payment Modal */}
      {payTarget && (
        <Modal open={!!payTarget} title="Record Payment" onClose={() => setPayTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Recording payment for claim <strong>{payTarget.claimNumber}</strong>.
              HMO amount: <strong>{fmt(payTarget.hmoAmount)}</strong>
            </p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Amount Paid (₦) *</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
              {parseFloat(amountPaid) > 0 && parseFloat(amountPaid) < payTarget.hmoAmount && (
                <p className="mt-1 text-xs text-amber-600">This is less than the full amount — claim will be marked as &quot;partial&quot;.</p>
              )}
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={actionSaving}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={actionSaving}>
              {actionSaving ? "Saving…" : "Record Payment"}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
