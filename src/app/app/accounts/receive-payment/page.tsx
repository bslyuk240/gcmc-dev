"use client";

import { useState } from "react";
import Link from "next/link";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { Toast, type ToastData } from "@/components/ui/toast";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const PATIENTS = [
  { id: "PAT-10491", name: "Kwame Asante", invoice: "INV-0441", balance: 2850 },
  { id: "PAT-10382", name: "Ama Owusu", invoice: "INV-0440", balance: 1200 },
  { id: "PAT-10271", name: "Kofi Mensah", invoice: "INV-0438", balance: 750 },
  { id: "PAT-10155", name: "Efua Boateng", invoice: "INV-0435", balance: 3400 },
  { id: "PAT-10133", name: "Johnathan Doe", invoice: "INV-88291", balance: 1240.5 },
];

type RecentPayment = { patient: string; amount: number; method: string; ref: string; time: string };

const RECENT_PAYMENTS: RecentPayment[] = [
  { patient: "Sarah Mitchell", amount: 450, method: "Cash", ref: "PAY-9818", time: "09:10" },
  { patient: "Robert Wilson", amount: 2100, method: "Insurance", ref: "PAY-9817", time: "08:55" },
  { patient: "Elena Kostic", amount: 85, method: "Mobile Money", ref: "PAY-9816", time: "08:40" },
];

export default function ReceivePaymentPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(typeof PATIENTS)[0] | null>(null);
  const [method, setMethod] = useState<"Cash" | "POS / Card" | "Mobile Money" | "Insurance">("Cash");
  const [amount, setAmount] = useState("");
  const [ref, setRef] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>(RECENT_PAYMENTS);
  const [processing, setProcessing] = useState(false);

  const filtered = search.length > 1
    ? PATIENTS.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.invoice.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  function selectPatient(p: (typeof PATIENTS)[0]) {
    setSelected(p);
    setAmount(p.balance.toFixed(2));
    setSearch(p.name);
  }

  function handleProcess() {
    if (!selected || !amount) return;
    setProcessing(true);
    setTimeout(() => {
      const newPayment: RecentPayment = {
        patient: selected.name,
        amount: parseFloat(amount),
        method,
        ref: ref || `PAY-${Date.now().toString().slice(-5)}`,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setRecentPayments((prev) => [newPayment, ...prev].slice(0, 8));
      setToast({ message: `Payment of ₦${parseFloat(amount).toLocaleString()} received for ${selected.name}.`, type: "success" });
      setSelected(null);
      setSearch("");
      setAmount("");
      setRef("");
      setShowConfirm(false);
      setProcessing(false);
    }, 800);
  }

  const canProcess = selected && amount && parseFloat(amount) > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Receive Payment</h1>
        <p className="mt-1 text-sm text-slate-500">Search for invoices and process patient payments efficiently.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Patient / Invoice search */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Select Patient or Invoice</h3>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setSelected(null); }}
                placeholder="Search by Patient Name, ID or Invoice Number…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>
            {filtered.length > 0 && !selected && (
              <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
                {filtered.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.id} · {p.invoice}</p>
                      </div>
                      <span className="font-bold text-slate-900">₦{p.balance.toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Payment form */}
          {selected && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-6">
                <div>
                  <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[var(--accent-foreground)]">Patient Selected</p>
                  <h4 className="text-2xl font-bold text-slate-900">{selected.name}</h4>
                  <p className="text-sm text-slate-500">ID: {selected.id} | Invoice: {selected.invoice}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Outstanding Balance</p>
                  <p className="text-3xl font-black text-slate-900">₦{selected.balance.toLocaleString()}</p>
                </div>
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
            {recentPayments.map((p, i) => (
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
            ))}
          </div>
        </aside>
      </div>

      {/* Confirm payment modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Payment">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Patient</span><span className="font-semibold">{selected?.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Invoice</span><span className="font-mono">{selected?.invoice}</span></div>
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
