"use client";

import { useState } from "react";
import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { Toast, type ToastData } from "@/components/ui/toast";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type RecentPayment = { patient: string; amount: number; method: string; ref: string; time: string };

export default function ReceivePaymentPage() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"Cash" | "POS / Card" | "Mobile Money" | "Insurance">("Cash");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [patientName, setPatientName] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [processing, setProcessing] = useState(false);

  const canProcess = patientName.trim() && amount && parseFloat(amount) > 0;

  function handleProcess() {
    if (!canProcess) return;
    setProcessing(true);
    setTimeout(() => {
      const newPayment: RecentPayment = {
        patient: patientName.trim(),
        amount: parseFloat(amount),
        method,
        ref: ref || `PAY-${Date.now().toString().slice(-5)}`,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setRecentPayments((prev) => [newPayment, ...prev].slice(0, 8));
      setToast({ message: `Payment of ₦${parseFloat(amount).toLocaleString()} received for ${patientName.trim()}.`, type: "success" });
      setPatientName("");
      setSearch("");
      setAmount("");
      setRef("");
      setShowConfirm(false);
      setProcessing(false);
    }, 800);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Receive Payment</h1>
        <p className="mt-1 text-sm text-slate-500">Enter patient details and process payment directly.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Patient name entry */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Patient Name / Invoice Reference</h3>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient name or invoice number…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </section>

          {/* Payment form */}
          {patientName.trim() && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 border-b border-slate-100 pb-6">
                <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[var(--accent-foreground)]">Recording Payment For</p>
                <h4 className="text-2xl font-bold text-slate-900">{patientName.trim()}</h4>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-900">Payment Method</label>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(["Cash", "POS / Card", "Mobile Money", "Insurance"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`rounded-xl border-2 p-3 text-xs font-bold transition ${method === m ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent-foreground)]" : "border-slate-100 text-slate-500 hover:border-slate-200"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900">Amount to Pay (₦)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-2xl font-bold text-slate-900 outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-slate-100 pt-8 md:flex-row md:items-end">
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="Transaction reference / internal note (optional)"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[var(--accent)] focus:bg-white"
                />
                <button
                  type="button"
                  disabled={!canProcess}
                  onClick={() => setShowConfirm(true)}
                  className="rounded-xl bg-[var(--accent)] px-10 py-4 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Process Payment
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Recent payments sidebar */}
        <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recent Payments</h3>
            <Link href={`${INTERNAL_PREFIX}/accounts/payments-history`} className="text-xs font-bold text-[var(--accent)] hover:underline">
              View All →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-400">No payments recorded this session.</p>
            ) : (
              recentPayments.map((p, i) => (
                <div key={`${p.ref}-${i}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{p.patient}</span>
                    <span className="font-bold text-emerald-700">₦{p.amount.toLocaleString()}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
                    <span>{p.method}</span>
                    <span>{p.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Confirm payment modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Payment">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{patientName.trim()}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-semibold">{method}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Amount</span><span className="text-lg font-bold text-slate-900">₦{parseFloat(amount || "0").toLocaleString()}</span></div>
          {ref && <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono text-xs">{ref}</span></div>}
        </div>
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setShowConfirm(false)} disabled={processing}>Cancel</Button>
          <Button size="md" onClick={handleProcess} disabled={processing}>
            {processing ? "Processing…" : "Confirm & Receive"}
          </Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
