"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updateNursingChargeStatus } from "@/lib/data/accounts-store";
import { updateProcedureBillStatus } from "@/lib/data/nurses-store";
import { printReceipt } from "@/lib/utils/print-receipt";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Billed: "bg-sky-50 text-sky-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
  Partial: "bg-violet-50 text-violet-700",
};

const UNIT_STYLES: Record<string, string> = {
  Ward: "bg-emerald-50 text-emerald-700",
  Emergency: "bg-amber-50 text-amber-700",
  ICU: "bg-red-50 text-red-700",
  Outpatient: "bg-sky-50 text-sky-700",
};

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

function formatNursingTimestamp(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function NursingBillingPage() {
  const { nursingCharges, metrics } = useAccountsStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Billed" | "Paid">("All");
  const [payTarget, setPayTarget] = useState<string | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [refNote, setRefNote] = useState("");
  // Optimistic local state — instant UI update regardless of store subscription timing
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(new Set());
  const [optimisticWaivedIds, setOptimisticWaivedIds] = useState<Set<string>>(new Set());

  function effectiveStatus(c: { id: string; status: string }) {
    if (optimisticPaidIds.has(c.id)) return "Paid";
    if (optimisticWaivedIds.has(c.id)) return "Waived";
    return c.status;
  }

  function openReceiveModal(id: string) {
    setPayTarget(id);
    setMethod("Cash");
    setRefNote("");
  }

  const filtered = filter === "All" ? nursingCharges : nursingCharges.filter((c) => {
    const s = effectiveStatus(c);
    return filter === "Pending" ? (s === "Pending" || s === "Billed") : s === filter;
  });

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "The action could not be completed.";
  }

  async function handlePayment() {
    if (!payTarget) return;
    const charge = nursingCharges.find((c) => c.id === payTarget);
    // Instant optimistic update — UI changes immediately
    setOptimisticPaidIds((prev) => new Set([...prev, payTarget]));
    setPayTarget(null);
    setToast({
      message: `Payment received for ${charge?.patientName ?? "patient"} via ${method}${refNote.trim() ? ` (${refNote.trim()})` : ""}.`,
      type: "success",
    });
    try {
      await updateNursingChargeStatus(payTarget, "Paid", {
        paidAt: new Date().toISOString(),
        paymentMethod: method,
      });
      await updateProcedureBillStatus(payTarget, "Paid");
      window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
    } catch (error) {
      setToast({ message: `Nursing payment update failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  async function handleWaive() {
    if (!waiveTarget) return;
    const charge = nursingCharges.find((c) => c.id === waiveTarget);
    // Instant optimistic update
    setOptimisticWaivedIds((prev) => new Set([...prev, waiveTarget]));
    setWaiveTarget(null);
    setToast({ message: `Nursing charge waived for ${charge?.patientName ?? "patient"}.`, type: "info" });
    try {
      await updateNursingChargeStatus(waiveTarget, "Waived");
      await updateProcedureBillStatus(waiveTarget, "Waived");
      window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
    } catch (error) {
      setToast({ message: `Nursing charge waive failed: ${getErrorMessage(error)}`, type: "error" });
    }
  }

  const payCharge = nursingCharges.find((c) => c.id === payTarget);
  const waiveCharge = nursingCharges.find((c) => c.id === waiveTarget);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Nursing Billing"
        description="Manage nursing procedure charges from Ward, Emergency, and ICU units. Receive payments or waive fees."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Collection", value: metrics.nursingPendingCount, sub: `₦${metrics.nursingPendingValue} outstanding`, color: "text-amber-600" },
          { label: "Paid Today", value: metrics.nursingPaidToday, sub: "₦" + nursingCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0), color: "text-emerald-700" },
          { label: "Total Procedures", value: nursingCharges.length, sub: `${nursingCharges.filter((c) => c.status === "Waived").length} waived`, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((c) => {
          const status = effectiveStatus(c);
          return (
            <Card key={c.id} className={`p-4 ${status === "Pending" || status === "Billed" ? "bg-amber-50/20" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.patientName}</p>
                  <p className="text-xs text-slate-500">{c.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES[c.status]}`}>{status}</span>
              </div>

              <div className="mt-4 space-y-2">
                <MobileMeta label="Unit" value={c.unit} />
                <MobileMeta label="Procedure" value={c.procedureType} />
                <MobileMeta label="Description" value={c.description} />
                <MobileMeta label="Performed By" value={c.performedBy} />
                <MobileMeta label="Time" value={formatNursingTimestamp(c.paidAt ?? c.performedAt)} />
                <MobileMeta label="Amount" value={`NGN ${c.amount}`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(status === "Pending" || status === "Billed") && (
                  <>
                    <Button size="sm" onClick={() => openReceiveModal(c.id)}>Receive Payment</Button>
                    <Button size="sm" variant="ghost" onClick={() => setWaiveTarget(c.id)}>Waive</Button>
                  </>
                )}
                {status === "Paid" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-500"
                    onClick={() => printReceipt({
                      title: "Nursing Procedure Receipt",
                      subtitle: c.procedureType,
                      refNumber: c.id,
                      lines: [
                        { label: "Patient", value: c.patientName },
                        { label: "Unit", value: c.unit },
                        { label: "Procedure", value: c.description },
                        { label: "Performed By", value: c.performedBy },
                        { label: "Payment Method", value: c.paymentMethod ?? "Cash" },
                        { label: "Date", value: formatNursingTimestamp(c.paidAt ?? c.performedAt) },
                        { label: "Status", value: "PAID", bold: true },
                      ],
                      total: { label: "Amount Paid", value: `NGN ${c.amount.toLocaleString()}` },
                      copyLabel: "PATIENT COPY",
                    })}
                  >
                    Receipt
                  </Button>
                )}
                {status === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-400">No nursing charges found.</Card>
        )}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="font-bold text-slate-900">Nursing Procedure Charges</h3>
          <div className="flex gap-1.5">
            {(["All", "Pending", "Paid"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === f ? "bg-accent text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Patient", "Unit", "Procedure", "Description", "Performed By", "Time", "Amount", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.patientName}</p>
                    <p className="text-xs text-slate-400">{c.patientId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${UNIT_STYLES[c.unit] ?? "bg-slate-100 text-slate-600"}`}>{c.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.procedureType}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{c.description}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.performedBy}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <span className="block font-medium text-slate-700">{formatNursingTimestamp(c.paidAt ?? c.performedAt)}</span>
                    <span className="text-[11px] text-slate-400">{c.paidAt ? "Paid" : "Performed"}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">₦{c.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[effectiveStatus(c)] ?? STATUS_STYLES[c.status]}`}>{effectiveStatus(c)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(effectiveStatus(c) === "Pending" || effectiveStatus(c) === "Billed") && (
                        <>
                          <Button size="sm" onClick={() => openReceiveModal(c.id)}>Receive Payment</Button>
                          <Button size="sm" variant="ghost" onClick={() => setWaiveTarget(c.id)}>Waive</Button>
                        </>
                      )}
                      {effectiveStatus(c) === "Paid" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-emerald-700">Paid ✓</span>
                          <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => printReceipt({
                            title: "Nursing Procedure Receipt",
                            subtitle: c.procedureType,
                            refNumber: c.id,
                            lines: [
                              { label: "Patient",    value: c.patientName },
                              { label: "Unit",       value: c.unit },
                              { label: "Procedure",  value: c.description },
                              { label: "Performed By", value: c.performedBy },
                              { label: "Payment Method", value: c.paymentMethod ?? "Cash" },
                              { label: "Date",       value: formatNursingTimestamp(c.paidAt ?? c.performedAt) },
                              { label: "Status",     value: "PAID", bold: true },
                            ],
                            total: { label: "Amount Paid", value: `₦${c.amount.toLocaleString()}` },
                            copyLabel: "PATIENT COPY",
                          })}>🖨 Receipt</Button>
                        </div>
                      )}
                      {effectiveStatus(c) === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-400">No nursing charges found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Receive Payment Modal */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Receive Payment">
        {payCharge && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><strong>{payCharge.patientName}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Procedure</span><span>{payCharge.procedureType}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit</span><span>{payCharge.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Performed</span><span className="text-slate-700">{formatNursingTimestamp(payCharge.performedAt)}</span></div>
              <div className="flex justify-between text-base"><span className="font-semibold text-slate-700">Amount Due</span><strong className="text-emerald-700">NGN {payCharge.amount}</strong></div>
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
              <textarea
                value={refNote}
                onChange={(e) => setRefNote(e.target.value)}
                rows={3}
                placeholder="Receipt number, note, or payment reference"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button size="md" onClick={() => void handlePayment()}>Confirm Payment Received</Button>
        </ModalFooter>
      </Modal>

      {/* Waive Modal */}
      <Modal open={!!waiveTarget} onClose={() => setWaiveTarget(null)} title="Waive Nursing Charge">
        {waiveCharge && (
          <p className="text-sm text-slate-700">
            Waive the <strong>₦{waiveCharge.amount} {waiveCharge.procedureType}</strong> charge for <strong>{waiveCharge.patientName}</strong>?
            This action cannot be undone.
          </p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setWaiveTarget(null)}>Cancel</Button>
          <Button size="md" onClick={() => void handleWaive()}>Confirm Waive</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
