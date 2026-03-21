"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import {
  syncNhisFromSupabase,
  addHmoClaim,
  updateHmoClaimStatus,
  type HmoClaim,
  type HmoClaimService,
} from "@/lib/data/nhis-store";

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

type ServiceRow = {
  type: string;
  description: string;
  amount: string;
  hmoAmount: string;
  copay: string;
};

const EMPTY_SERVICE: ServiceRow = { type: "consultation", description: "", amount: "", hmoAmount: "", copay: "" };

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NhisClaimsPage() {
  const { schemes, enrollments, claims, hydrated } = useNhisStore();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeTab, setActiveTab] = useState<ClaimTab>("draft");

  // New claim modal
  const [showNewClaim, setShowNewClaim] = useState(false);
  // selectedEnrollmentId drives everything — patient UUID + scheme are derived from it
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [newClaimNotes, setNewClaimNotes] = useState("");

  // Derived from selected enrollment
  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId) ?? null;
  const newClaimSchemeId = selectedEnrollment?.schemeId ?? "";
  const newClaimPatientId = selectedEnrollment?.patientId ?? ""; // UUID
  const [services, setServices] = useState<ServiceRow[]>([{ ...EMPTY_SERVICE }]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status action modals
  const [rejectTarget, setRejectTarget] = useState<HmoClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [payTarget, setPayTarget] = useState<HmoClaim | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    syncNhisFromSupabase();
  }, []);

  const tabClaims = claims.filter((c) => c.status === activeTab);

  const tabReceivables = (["submitted", "approved", "partial"] as const).includes(activeTab as "submitted" | "approved" | "partial")
    ? tabClaims.reduce((sum, c) => sum + c.hmoAmount, 0)
    : null;

  // ── New claim ──────────────────────────────────────────────────────────────

  function addServiceRow() {
    setServices((prev) => [...prev, { ...EMPTY_SERVICE }]);
  }

  function removeServiceRow(idx: number) {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateService(idx: number, key: keyof ServiceRow, value: string) {
    setServices((prev) => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  }

  function calcTotals() {
    const totalCost = services.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const hmoAmount = services.reduce((s, r) => s + (parseFloat(r.hmoAmount) || 0), 0);
    const copayAmount = services.reduce((s, r) => s + (parseFloat(r.copay) || 0), 0);
    return { totalCost, hmoAmount, copayAmount };
  }

  const totals = calcTotals();

  async function handleSaveDraft() {
    if (!selectedEnrollmentId || !selectedEnrollment) {
      setFormError("Please select an enrolled patient.");
      return;
    }
    if (services.length === 0 || !services.some((r) => r.description.trim())) {
      setFormError("At least one service with a description is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const claimServices: HmoClaimService[] = services
        .filter((r) => r.description.trim())
        .map((r, idx) => ({
          type: r.type,
          chargeId: `SVC-${Date.now()}-${idx}`,
          description: r.description.trim(),
          amount: parseFloat(r.amount) || 0,
          hmoAmount: parseFloat(r.hmoAmount) || 0,
          copay: parseFloat(r.copay) || 0,
        }));

      await addHmoClaim(
        {
          schemeId: selectedEnrollment.schemeId,
          patientId: selectedEnrollment.patientId, // UUID — correct FK
          enrollmentId: selectedEnrollment.id,
          services: claimServices,
          totalCost: totals.totalCost,
          copayAmount: totals.copayAmount,
          hmoAmount: totals.hmoAmount,
          status: "draft",
          notes: newClaimNotes.trim() || undefined,
        },
        selectedEnrollment.schemeName,
        selectedEnrollment.patientName,
      );

      setToast({ message: "Claim saved as draft.", type: "success" });
      setShowNewClaim(false);
      setSelectedEnrollmentId("");
      setNewClaimNotes("");
      setServices([{ ...EMPTY_SERVICE }]);
      setActiveTab("draft");
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
      await updateHmoClaimStatus(claim.id, {
        status: "submitted",
        submittedAt: new Date().toISOString(),
      });
      setToast({ message: `Claim ${claim.claimNumber} submitted to HMO.`, type: "success" });
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
      await updateHmoClaimStatus(claim.id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      });
      setToast({ message: `Claim ${claim.claimNumber} marked as approved.`, type: "success" });
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
      await updateHmoClaimStatus(rejectTarget.id, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectionReason.trim(),
      });
      setToast({ message: `Claim ${rejectTarget.claimNumber} rejected.`, type: "info" });
      setRejectTarget(null);
      setRejectionReason("");
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
      await updateHmoClaimStatus(payTarget.id, {
        status: isPartial ? "partial" : "paid",
        paidAt: new Date().toISOString(),
        amountPaid: paid,
      });
      setToast({ message: `Payment of ${fmt(paid)} recorded for claim ${payTarget.claimNumber}.`, type: "success" });
      setPayTarget(null);
      setAmountPaid("");
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
          <div className="overflow-x-auto">
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
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedEnrollmentId}
                onChange={(e) => setSelectedEnrollmentId(e.target.value)}
              >
                <option value="">— Select enrolled patient —</option>
                {enrollments.filter((e) => e.isActive).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.patientName} ({e.patientDisplayId || e.patientId}) — {e.schemeName}
                  </option>
                ))}
              </select>
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

            {/* Services */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">Services *</label>
                <button onClick={addServiceRow} className="text-xs font-semibold text-accent hover:underline">+ Add Row</button>
              </div>
              <div className="space-y-2">
                {services.map((row, idx) => (
                  <div key={idx} className="grid gap-2 grid-cols-5 items-end">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-500">Type</label>
                      <select
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        value={row.type}
                        onChange={(e) => updateService(idx, "type", e.target.value)}
                      >
                        {["consultation", "lab", "pharmacy", "nursing", "procedure", "admission", "other"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold text-slate-500">Description</label>
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        value={row.description}
                        onChange={(e) => updateService(idx, "description", e.target.value)}
                        placeholder="Service description"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold text-slate-500">Total (₦)</label>
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        type="number"
                        min="0"
                        value={row.amount}
                        onChange={(e) => updateService(idx, "amount", e.target.value)}
                      />
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1">
                        <label className="mb-1 block text-[10px] font-semibold text-slate-500">HMO (₦)</label>
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                          type="number"
                          min="0"
                          value={row.hmoAmount}
                          onChange={(e) => updateService(idx, "hmoAmount", e.target.value)}
                        />
                      </div>
                      {services.length > 1 && (
                        <button onClick={() => removeServiceRow(idx)} className="mt-5 text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
