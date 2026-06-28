"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useNhisStore } from "@/lib/hooks/use-nhis-store";
import {
  fetchHmoRemittances,
  fmtNaira,
  postHmoRemittanceApi,
} from "@/lib/nhis/client";
import type { HmoClaim, HmoRemittance } from "@/modules/nhis/types";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NhisRemittancesPage() {
  const { schemes, claims, hydrated, reload } = useNhisStore();
  const [remittances, setRemittances] = useState<HmoRemittance[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [schemeId, setSchemeId] = useState("");
  const [remittanceRef, setRemittanceRef] = useState("");
  const [amount, setAmount] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedClaims, setSelectedClaims] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRemittances() {
    try {
      setRemittances(await fetchHmoRemittances());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (hydrated) void loadRemittances();
  }, [hydrated]);

  const payableClaims = claims.filter((c) =>
    c.schemeId === schemeId && ["submitted", "approved", "partial"].includes(c.status),
  );

  const allocationTotal = Object.values(selectedClaims).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0,
  );

  function toggleClaim(claim: HmoClaim, checked: boolean) {
    setSelectedClaims((prev) => {
      const next = { ...prev };
      if (checked) {
        const remaining = claim.hmoAmount - (claim.amountPaid ?? 0);
        next[claim.id] = String(remaining);
      } else {
        delete next[claim.id];
      }
      return next;
    });
  }

  async function handleSave() {
    if (!schemeId) { setError("Select an HMO scheme."); return; }
    if (!remittanceRef.trim()) { setError("Remittance reference is required."); return; }
    const total = parseFloat(amount);
    if (isNaN(total) || total <= 0) { setError("Enter a valid remittance amount."); return; }
    const allocations = Object.entries(selectedClaims)
      .map(([claimId, amt]) => ({ claimId, amount: parseFloat(amt) || 0 }))
      .filter((a) => a.amount > 0);
    if (!allocations.length) { setError("Allocate to at least one claim."); return; }
    if (Math.abs(allocationTotal - total) > 0.01) {
      setError("Allocations must equal the remittance amount.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await postHmoRemittanceApi({
        schemeId,
        remittanceRef: remittanceRef.trim(),
        amount: total,
        bankReference: bankReference.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations,
      });
      setToast({ message: "Remittance recorded.", type: "success" });
      setShowModal(false);
      setSchemeId("");
      setRemittanceRef("");
      setAmount("");
      setBankReference("");
      setNotes("");
      setSelectedClaims({});
      await Promise.all([loadRemittances(), reload()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save remittance";
      setError(msg);
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="HMO Remittances"
        description="Record HMO bank payments and allocate to approved claims."
        action={<Button onClick={() => setShowModal(true)}>+ Record Remittance</Button>}
      />

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Remittance history</h3>
        </div>
        {!hydrated ? (
          <p className="px-5 py-8 text-sm text-slate-400">Loading…</p>
        ) : remittances.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No remittances recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {remittances.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.remittanceRef}</p>
                    <p className="text-xs text-slate-500">{r.schemeName} · {formatDate(r.receivedAt)}</p>
                    {r.bankReference ? <p className="text-xs text-slate-400">Bank ref: {r.bankReference}</p> : null}
                  </div>
                  <p className="text-lg font-bold text-emerald-700">{fmtNaira(r.amount)}</p>
                </div>
                {r.allocations.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {r.allocations.map((a) => (
                      <li key={a.claimId}>
                        {a.claimNumber ?? a.claimId.slice(0, 8)} — {fmtNaira(a.amount)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {showModal ? (
        <Modal open title="Record HMO Remittance" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">HMO Scheme *</label>
              <SearchableSelect
                value={schemeId}
                onChange={(v) => { setSchemeId(v); setSelectedClaims({}); }}
                placeholder="Select scheme"
                options={schemes.filter((s) => s.isActive).map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Remittance ref *</label>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={remittanceRef} onChange={(e) => setRemittanceRef(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Amount (₦) *</label>
                <input type="number" min="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Bank reference</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={bankReference} onChange={(e) => setBankReference(e.target.value)} />
            </div>
            {schemeId ? (
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-600">Allocate to claims</label>
                {payableClaims.length === 0 ? (
                  <p className="text-sm text-slate-400">No payable claims for this scheme.</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {payableClaims.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={c.id in selectedClaims}
                          onChange={(e) => toggleClaim(c, e.target.checked)}
                        />
                        <span className="flex-1 font-medium">{c.claimNumber} · {c.patientName}</span>
                        <input
                          type="number"
                          min="0"
                          className="w-24 rounded border border-slate-200 px-2 py-1"
                          value={selectedClaims[c.id] ?? ""}
                          disabled={!(c.id in selectedClaims)}
                          onChange={(e) => setSelectedClaims((p) => ({ ...p, [c.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">Allocated: {fmtNaira(allocationTotal)}</p>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Notes</label>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => void handleSave()}>{saving ? "Saving…" : "Record remittance"}</Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}
