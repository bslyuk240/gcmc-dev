"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updateNursingChargeStatus } from "@/lib/data/accounts-store";
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

export default function NursingBillingPage() {
  const { nursingCharges, metrics } = useAccountsStore();
  const [filter, setFilter] = useState<"All" | "Pending" | "Billed" | "Paid">("All");
  const [payTarget, setPayTarget] = useState<string | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const filtered = filter === "All" ? nursingCharges : nursingCharges.filter((c) =>
    filter === "Pending" ? (c.status === "Pending" || c.status === "Billed" as string) : c.status === filter
  );

  function handlePayment() {
    if (!payTarget) return;
    const charge = nursingCharges.find((c) => c.id === payTarget);
    updateNursingChargeStatus(payTarget, "Paid");
    setToast({ message: `Payment received for ${charge?.patientName ?? "patient"}.`, type: "success" });
    setPayTarget(null);
  }

  function handleWaive() {
    if (!waiveTarget) return;
    const charge = nursingCharges.find((c) => c.id === waiveTarget);
    updateNursingChargeStatus(waiveTarget, "Waived");
    setToast({ message: `Nursing charge waived for ${charge?.patientName ?? "patient"}.`, type: "info" });
    setWaiveTarget(null);
  }

  const payCharge = nursingCharges.find((c) => c.id === payTarget);
  const waiveCharge = nursingCharges.find((c) => c.id === waiveTarget);

  return (
    <div className="space-y-6">
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
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
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
                  <td className="px-4 py-3 text-xs text-slate-400">{c.performedAt}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">₦{c.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {(c.status === "Pending" || (c.status as string) === "Billed") && (
                        <>
                          <Button size="sm" onClick={() => setPayTarget(c.id)}>Receive Payment</Button>
                          <Button size="sm" variant="ghost" onClick={() => setWaiveTarget(c.id)}>Waive</Button>
                        </>
                      )}
                      {c.status === "Paid" && (
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
                              { label: "Date",       value: c.performedAt },
                              { label: "Status",     value: "PAID", bold: true },
                            ],
                            total: { label: "Amount Paid", value: `₦${c.amount.toLocaleString()}` },
                            copyLabel: "PATIENT COPY",
                          })}>🖨 Receipt</Button>
                        </div>
                      )}
                      {c.status === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
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
              <div className="flex justify-between text-base"><span className="font-semibold text-slate-700">Amount Due</span><strong className="text-emerald-700">₦{payCharge.amount}</strong></div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handlePayment}>Confirm Payment Received</Button>
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
          <Button size="md" onClick={handleWaive}>Confirm Waive</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
