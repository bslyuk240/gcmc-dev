"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { updateBillStatus, type PharmacyBill } from "@/lib/data/pharmacy-store";
import { printReceipt } from "@/lib/utils/print-receipt";

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
};

function drugLabel(drugs: unknown): string {
  if (typeof drugs === "string") return drugs;
  if (Array.isArray(drugs)) return drugs.map((d: { name?: string; qty?: string }) => `${d.name ?? ""} × ${d.qty ?? ""}`).join(", ");
  return "—";
}

const SOURCE_LABELS: Record<string, string> = {
  prescription: "Doctor Rx",
  "nurse-request": "Nurse Request",
  "walk-in": "Walk-in",
};

const SOURCE_STYLES: Record<string, string> = {
  prescription: "bg-violet-50 text-violet-700",
  "nurse-request": "bg-sky-50 text-sky-700",
  "walk-in": "bg-slate-100 text-slate-600",
};

type Filter = "All" | "Pending" | "Paid" | "Waived";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AccountsPharmacyBillingPage() {
  const { bills } = usePharmacyStore();
  const [filter, setFilter] = useState<Filter>("All");
  const [payTarget, setPayTarget] = useState<PharmacyBill | null>(null);
  const [waiverTarget, setWaiverTarget] = useState<PharmacyBill | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [refNote, setRefNote] = useState("");
  // Optimistic local state — instant UI update regardless of store subscription timing
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(new Set());
  const [optimisticWaivedIds, setOptimisticWaivedIds] = useState<Set<string>>(new Set());

  function effectiveStatus(b: { id: string; billStatus: string }) {
    if (optimisticPaidIds.has(b.id)) return "Paid";
    if (optimisticWaivedIds.has(b.id)) return "Waived";
    return b.billStatus;
  }

  const filtered = filter === "All" ? bills : bills.filter((b) => effectiveStatus(b) === filter);

  const totalPending = bills.filter((b) => effectiveStatus(b) === "Pending").reduce((s, b) => s + b.totalCost, 0);
  const totalPaid = bills.filter((b) => effectiveStatus(b) === "Paid").reduce((s, b) => s + b.totalCost, 0);
  const pendingCount = bills.filter((b) => effectiveStatus(b) === "Pending").length;

  function handleConfirmPayment() {
    if (!payTarget) return;
    // Instant optimistic update
    setOptimisticPaidIds((prev) => new Set([...prev, payTarget.id]));
    setToast({ message: `₦${payTarget.totalCost.toLocaleString()} received from ${payTarget.patientName} via ${method}.`, type: "success" });
    setPayTarget(null);
    setRefNote("");
    updateBillStatus(payTarget.id, "Paid", { paidAt: new Date().toISOString(), paymentMethod: method });
  }

  function handleWaive() {
    if (!waiverTarget) return;
    // Instant optimistic update
    setOptimisticWaivedIds((prev) => new Set([...prev, waiverTarget.id]));
    setToast({ message: `Pharmacy bill for ${waiverTarget.patientName} waived.`, type: "info" });
    setWaiverTarget(null);
    updateBillStatus(waiverTarget.id, "Waived");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Pharmacy Billing"
        description="Medication charges from prescriptions, nurse requests, and walk-in dispensing."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Collection", value: `₦${totalPending.toLocaleString()}`, sub: `${pendingCount} bill${pendingCount !== 1 ? "s" : ""} outstanding`, color: "text-amber-600" },
          { label: "Collected Today", value: `₦${totalPaid.toLocaleString()}`, sub: `${bills.filter((b) => b.billStatus === "Paid").length} bills paid`, color: "text-emerald-700" },
          { label: "Total Bills", value: bills.length, sub: "All time across all sources", color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((b) => {
          const status = effectiveStatus(b);
          return (
            <Card key={b.id} className={`p-4 ${status === "Pending" ? "bg-amber-50/20" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{b.patientName}</p>
                  <p className="text-xs text-slate-500">{b.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.Pending}`}>
                  {status}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <MobileMeta label="Drugs / Items" value={drugLabel(b.drugs)} />
                <MobileMeta label="Source" value={SOURCE_LABELS[b.source]} />
                <MobileMeta label="Amount" value={`NGN ${b.totalCost.toLocaleString()}`} />
                <MobileMeta label="Dispensed At" value={b.dispensedAt} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {status === "Pending" && (
                  <>
                    <Button size="sm" onClick={() => { setPayTarget(b); setMethod("Cash"); setRefNote(""); }}>Receive Payment</Button>
                    <Button size="sm" variant="ghost" onClick={() => setWaiverTarget(b)}>Waive</Button>
                  </>
                )}
                {status === "Paid" && (
                  <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => printReceipt({
                    title: "Pharmacy Receipt",
                    subtitle: SOURCE_LABELS[b.source],
                    refNumber: b.id,
                    lines: [
                      { label: "Patient", value: b.patientName },
                      { label: "Patient ID", value: b.patientId },
                      { label: "Items", value: drugLabel(b.drugs) },
                      { label: "Source", value: SOURCE_LABELS[b.source] },
                      { label: "Dispensed At", value: b.dispensedAt },
                      { label: "Status", value: "PAID", bold: true },
                    ],
                    total: { label: "Amount Paid", value: `NGN ${b.totalCost.toLocaleString()}` },
                    copyLabel: "PATIENT COPY",
                  })}>
                    Receipt
                  </Button>
                )}
                {status === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-400">No pharmacy bills found.</Card>
        )}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-bold text-slate-900">Pharmacy Charge Records</h3>
          <div className="flex gap-2">
            {(["All", "Pending", "Paid", "Waived"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filter === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Patient", "Drugs / Items", "Source", "Amount", "Dispensed At", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{b.patientName}</p>
                    <p className="text-xs text-slate-400">{b.patientId}</p>
                  </td>
                  <td className="max-w-[200px] px-5 py-3 text-slate-700 truncate">{drugLabel(b.drugs)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SOURCE_STYLES[b.source]}`}>
                      {SOURCE_LABELS[b.source]}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{b.totalCost.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{b.dispensedAt}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[effectiveStatus(b)]}`}>
                      {effectiveStatus(b)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {effectiveStatus(b) === "Pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setPayTarget(b); setMethod("Cash"); setRefNote(""); }}>Receive Payment</Button>
                        <Button size="sm" variant="ghost" onClick={() => setWaiverTarget(b)}>Waive</Button>
                      </div>
                    )}
                    {effectiveStatus(b) === "Paid" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid</span>
                        <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => printReceipt({
                          title: "Pharmacy Receipt",
                          subtitle: SOURCE_LABELS[b.source],
                          refNumber: b.id,
                          lines: [
                            { label: "Patient",      value: b.patientName },
                            { label: "Patient ID",   value: b.patientId },
                            { label: "Items",        value: drugLabel(b.drugs) },
                            { label: "Source",       value: SOURCE_LABELS[b.source] },
                            { label: "Dispensed At", value: b.dispensedAt },
                            { label: "Status",       value: "PAID", bold: true },
                          ],
                          total: { label: "Amount Paid", value: `₦${b.totalCost.toLocaleString()}` },
                          copyLabel: "PATIENT COPY",
                        })}>🖨 Receipt</Button>
                      </div>
                    )}
                    {effectiveStatus(b) === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No pharmacy bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor prescribes / Nurse requests / Walk-in dispense → Pharmacy dispenses → Bill created automatically → Accounts collects payment from patient.
      </div>

      {/* Receive Payment Modal */}
      <Modal open={!!payTarget} onClose={() => { setPayTarget(null); setRefNote(""); }} title="Receive Pharmacy Payment">
        {payTarget && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{payTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Items</span><span className="max-w-[200px] text-right text-slate-700">{drugLabel(payTarget.drugs)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Source</span><span>{SOURCE_LABELS[payTarget.source]}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">Amount Due</span>
                <span className="text-lg font-black text-slate-900">₦{payTarget.totalCost.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Method</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["Cash", "POS / Card", "Mobile Money", "Insurance"] as PayMethod[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMethod(value)}
                    className={`rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                      method === value
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                        : "border-slate-100 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reference / Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={refNote}
                onChange={(e) => setRefNote(e.target.value)}
                placeholder="Transaction reference or note..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => { setPayTarget(null); setRefNote(""); }}>Cancel</Button>
          <Button size="md" onClick={handleConfirmPayment}>Confirm Payment Received</Button>
        </ModalFooter>
      </Modal>

      {/* Waive Modal */}
      <Modal open={!!waiverTarget} onClose={() => setWaiverTarget(null)} title="Waive Pharmacy Bill">
        {waiverTarget && (
          <p className="text-sm text-slate-700">
            Waive the <strong>₦{waiverTarget.totalCost.toLocaleString()}</strong> pharmacy bill for{" "}
            <strong>{waiverTarget.patientName}</strong>?
          </p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setWaiverTarget(null)}>Cancel</Button>
          <Button size="md" className="bg-amber-600 text-white hover:opacity-95" onClick={handleWaive}>Waive Bill</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
