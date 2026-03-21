"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { updateConsultationFeeStatus, type ConsultationFee } from "@/lib/data/accounts-store";
import { printReceipt } from "@/lib/utils/print-receipt";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Waived: "bg-slate-100 text-slate-500",
  Partial: "bg-sky-50 text-sky-700",
};

const TYPE_FEES: Record<string, number> = {
  General: 100,
  Specialist: 250,
  Emergency: 180,
  "Follow-up": 60,
  Antenatal: 80,
};

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

function formatConsultationTimestamp(value?: string) {
  if (!value) return "—";
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

function isSameCalendarDay(value?: string) {
  if (!value) return false;
  const left = new Date(value);
  const right = new Date();
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return false;
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function AccountsConsultationFeesPage() {
  const { consultationFees, metrics } = useAccountsStore();

  const [payTarget, setPayTarget] = useState<ConsultationFee | null>(null);
  const [waiverTarget, setWaiverTarget] = useState<ConsultationFee | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Paid">("All");
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [refNote, setRefNote] = useState("");
  const [processing, setProcessing] = useState(false);
  // Optimistic local state — instant UI update regardless of store subscription timing
  const [optimisticPaidIds, setOptimisticPaidIds] = useState<Set<string>>(new Set());
  const [optimisticWaivedIds, setOptimisticWaivedIds] = useState<Set<string>>(new Set());

  function effectiveStatus(f: { id: string; status: string }) {
    if (optimisticPaidIds.has(f.id)) return "Paid";
    if (optimisticWaivedIds.has(f.id)) return "Waived";
    return f.status;
  }

  function openReceiveModal(fee: ConsultationFee) {
    setPayTarget(fee);
    setMethod("Cash");
    setRefNote("");
  }

  function handleReceivePayment() {
    if (!payTarget) return;
    // Instant optimistic update
    setOptimisticPaidIds((prev) => new Set([...prev, payTarget.id]));
    setPayTarget(null);
    setToast({
      message: `Consultation fee of ₦${payTarget.fee} received from ${payTarget.patientName} via ${method}${refNote.trim() ? ` (${refNote.trim()})` : ""}.`,
      type: "success",
    });
    updateConsultationFeeStatus(payTarget.id, "Paid", {
      paidAt: new Date().toISOString(),
      paymentMethod: method,
    });
    window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
  }

  function handleWaive() {
    if (!waiverTarget) return;
    // Instant optimistic update
    setOptimisticWaivedIds((prev) => new Set([...prev, waiverTarget.id]));
    setWaiverTarget(null);
    setToast({ message: `Fee for ${waiverTarget.patientName} waived.`, type: "info" });
    updateConsultationFeeStatus(waiverTarget.id, "Waived");
    window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
  }

  const filtered = filter === "All" ? consultationFees : consultationFees.filter((f) => effectiveStatus(f) === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation Fees"
        description="Doctor consultation charges billed to Accounts for collection from patients."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending Collection", value: metrics.consultationPendingCount, sub: `₦${metrics.consultationPendingValue.toLocaleString()} outstanding`, color: "text-amber-600" },
          {
            label: "Paid Today",
            value: consultationFees.filter((f) => f.status === "Paid" && isSameCalendarDay(f.paidAt ?? f.consultedAt)).length,
            sub: `₦${consultationFees.filter((f) => f.status === "Paid" && isSameCalendarDay(f.paidAt ?? f.consultedAt)).reduce((s, f) => s + f.fee, 0).toLocaleString()} collected`,
            color: "text-emerald-700",
          },
          { label: "Total This Month", value: consultationFees.length, sub: `${Object.keys(TYPE_FEES).length} fee types`, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Fee schedule reference */}
      <Card className="p-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3">Consultation Fee Schedule</h4>
        <div className="flex flex-wrap gap-3">
          {Object.entries(TYPE_FEES).map(([type, fee]) => (
            <div key={type} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
              <span className="font-semibold text-slate-700">{type}</span>
              <span className="ml-2 text-slate-500">₦{fee}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Consultation Fee Records</h3>
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
                {["Patient", "Patient ID", "Doctor", "Type", "Fee", "Consultation Time", "Status", "Action"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{f.patientName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{f.patientId}</td>
                  <td className="px-5 py-3 text-slate-600">{f.doctorName}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">{f.consultationType}</span>
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">₦{f.fee.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    <span className="block font-medium text-slate-700">{formatConsultationTimestamp(f.paidAt ?? f.consultedAt)}</span>
                    <span className="text-[11px] text-slate-400">{f.paidAt ? "Paid" : "Consulted"}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[effectiveStatus(f)] ?? STATUS_STYLES[f.status]}`}>{effectiveStatus(f)}</span>
                  </td>
                  <td className="px-5 py-3">
                    {effectiveStatus(f) === "Pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={processing} onClick={() => openReceiveModal(f)}>Receive Payment</Button>
                        <Button size="sm" variant="ghost" disabled={processing} onClick={() => setWaiverTarget(f)}>Waive</Button>
                      </div>
                    )}
                    {effectiveStatus(f) === "Paid" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-700">✓ Paid</span>
                        <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => printReceipt({
                          title: "Consultation Fee Receipt",
                          subtitle: `${f.consultationType} Consultation`,
                          refNumber: f.id,
                          lines: [
                            { label: "Patient",    value: f.patientName },
                            { label: "Patient ID", value: f.patientId },
                            { label: "Doctor",     value: f.doctorName },
                            { label: "Type",       value: f.consultationType },
                            { label: "Date",       value: formatConsultationTimestamp(f.paidAt ?? f.consultedAt) },
                            { label: "Status",     value: "PAID", bold: true },
                          ],
                          total: { label: "Amount Paid", value: `₦${f.fee.toLocaleString()}` },
                          copyLabel: "PATIENT COPY",
                        })}>🖨 Receipt</Button>
                      </div>
                    )}
                    {effectiveStatus(f) === "Waived" && <span className="text-xs text-slate-400">Waived</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">No consultation fees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor completes consultation → bills fee via Doctors portal → record appears here → Accounts collects from patient.
      </div>

      {/* Receive Payment modal */}
      <Modal
        open={!!payTarget}
        onClose={() => {
          if (processing) return;
          setPayTarget(null);
          setRefNote("");
        }}
        title="Receive Consultation Fee"
      >
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{payTarget.patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span>{payTarget.doctorName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Consultation Type</span><span>{payTarget.consultationType}</span></div>
              <div className="flex justify-between"><span className="font-semibold text-slate-600">Fee Amount</span><span className="font-bold text-xl text-slate-900">₦{payTarget.fee}</span></div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
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
                onChange={(event) => setRefNote(event.target.value)}
                placeholder="Transaction reference or note..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" disabled={processing} onClick={() => { setPayTarget(null); setRefNote(""); }}>Cancel</Button>
          <Button size="md" disabled={processing} onClick={handleReceivePayment}>
            {processing ? "Processing..." : "Confirm Payment Received"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Waive modal */}
      <Modal
        open={!!waiverTarget}
        onClose={() => {
          if (processing) return;
          setWaiverTarget(null);
        }}
        title="Waive Consultation Fee"
      >
        {waiverTarget && (
          <div className="text-sm text-slate-700">
            <p>Are you sure you want to waive the <strong>₦{waiverTarget.fee}</strong> consultation fee for <strong>{waiverTarget.patientName}</strong>?</p>
            <p className="mt-2 text-xs text-slate-500">This action cannot be undone. A waiver record will be kept.</p>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="md" disabled={processing} onClick={() => setWaiverTarget(null)}>Cancel</Button>
          <Button size="md" className="bg-amber-600 text-white hover:opacity-95" disabled={processing} onClick={handleWaive}>
            {processing ? "Processing..." : "Waive Fee"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
