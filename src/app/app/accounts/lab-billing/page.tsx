"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updateLabChargeStatus, type LabCharge } from "@/lib/data/accounts-store";
import { printReceipt } from "@/lib/utils/print-receipt";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
  Partial: "bg-sky-50 text-sky-700",
};

export default function AccountsLabBillingPage() {
  const { labCharges, metrics } = useAccountsStore();
  const [payTarget, setPayTarget] = useState<LabCharge | null>(null);
  const [waiverTarget, setWaiverTarget] = useState<LabCharge | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Paid">("All");

  function handleReceivePayment() {
    if (!payTarget) return;
    updateLabChargeStatus(payTarget.id, "Paid");
    setToast({ message: `Lab fee of ₦${payTarget.amount} received from ${payTarget.patientName}.`, type: "success" });
    setPayTarget(null);
  }

  function handleWaive() {
    if (!waiverTarget) return;
    updateLabChargeStatus(waiverTarget.id, "Waived");
    setToast({ message: `Lab fee for ${waiverTarget.patientName} waived.`, type: "info" });
    setWaiverTarget(null);
  }

  const filtered = filter === "All" ? labCharges : labCharges.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab Test Billing"
        description="Charges generated when lab tests are completed. Collect payment from patients."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Collection", value: metrics.labPendingCount, sub: `₦${metrics.labPendingValue} outstanding`, color: "text-amber-600" },
          { label: "Paid Today", value: labCharges.filter((c) => c.status === "Paid").length, sub: `₦${labCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0)} collected`, color: "text-emerald-700" },
          { label: "Total Lab Charges", value: labCharges.length, sub: "All time", color: "text-slate-900" },
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
          <h3 className="font-bold text-slate-900">Lab Charge Records</h3>
          <div className="flex gap-2">
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
                {["Patient", "Test Name", "Ordered By", "Amount", "Completed At", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{c.patientName}</p>
                    <p className="text-xs text-slate-400">{c.patientId}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{c.testName}</td>
                  <td className="px-5 py-3 text-slate-500">{c.orderedBy}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{c.amount}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{c.completedAt}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    {c.status === "Pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setPayTarget(c)}>Receive Payment</Button>
                        <Button size="sm" variant="ghost" onClick={() => setWaiverTarget(c)}>Waive</Button>
                      </div>
                    )}
                    {c.status === "Paid" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid</span>
                        <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => printReceipt({
                          title: "Lab Test Receipt",
                          subtitle: `${c.testName}`,
                          refNumber: c.id,
                          lines: [
                            { label: "Patient", value: c.patientName },
                            { label: "Patient ID", value: c.patientId },
                            { label: "Test", value: c.testName },
                            { label: "Ordered By", value: c.orderedBy },
                            { label: "Completed", value: c.completedAt },
                            { label: "Status", value: "PAID", bold: true },
                          ],
                          total: { label: "Amount Paid", value: `₦${c.amount.toLocaleString()}` },
                          copyLabel: "PATIENT COPY",
                        })}>🖨 Receipt</Button>
                      </div>
                    )}
                    {c.status === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">No lab charges found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor orders test → Lab processes test → Result entered → Bill automatically created here → Accounts collects payment from patient.
      </div>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Receive Lab Test Payment">
        {payTarget && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{payTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Test</span><span>{payTarget.testName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ordered By</span><span>{payTarget.orderedBy}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-slate-600">Amount</span><span className="font-bold text-xl text-slate-900">₦{payTarget.amount}</span></div>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button size="md" onClick={handleReceivePayment}>Confirm Payment Received</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!waiverTarget} onClose={() => setWaiverTarget(null)} title="Waive Lab Fee">
        {waiverTarget && (
          <p className="text-sm text-slate-700">
            Waive the <strong>₦{waiverTarget.amount}</strong> lab fee for <strong>{waiverTarget.patientName}</strong> ({waiverTarget.testName})?
          </p>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setWaiverTarget(null)}>Cancel</Button>
          <Button size="md" className="bg-amber-600 text-white hover:opacity-95" onClick={handleWaive}>Waive Fee</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
