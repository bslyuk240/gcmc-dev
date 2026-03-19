"use client";

import { useState } from "react";
import { Toast, type ToastData } from "@/components/ui/toast";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import {
  updateFrontDeskChargeStatus,
  updateConsultationFeeStatus,
  updateLabChargeStatus,
  updateNursingChargeStatus,
  type FrontDeskCharge,
  type ConsultationFee,
  type LabCharge,
  type NursingCharge,
} from "@/lib/data/accounts-store";
import { useHMSSession } from "@/modules/rbac/hooks";

type AnyCharge =
  | (FrontDeskCharge  & { _source: "fd" })
  | (ConsultationFee  & { _source: "consult" })
  | (LabCharge        & { _source: "lab" })
  | (NursingCharge    & { _source: "nursing" });

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

function fmtDate(s: string) {
  if (!s) return "—";
  if (!s.includes("T")) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-GB", {
    hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
  });
}

function chargeSource(c: AnyCharge): string {
  if (c._source === "fd")      return "Front Desk";
  if (c._source === "consult") return "Consultation";
  if (c._source === "lab")     return "Laboratory";
  return "Nursing";
}

function chargeAmount(c: AnyCharge): number {
  return c._source === "consult" ? c.fee : c.amount;
}

function chargeDescription(c: AnyCharge): string {
  if (c._source === "fd") return c.description;
  if (c._source === "consult") return `${c.consultationType} consultation`;
  if (c._source === "lab") return c.testName;
  return c.description || c.procedureType;
}

export default function ReceivePaymentPage() {
  const { frontDeskCharges, consultationFees, labCharges, nursingCharges } = useAccountsStore();
  const session = useHMSSession();
  const receivedBy = session?.full_name ?? "Accounts";

  const [target, setTarget]       = useState<AnyCharge | null>(null);
  const [method, setMethod]       = useState<PayMethod>("Cash");
  const [refNote, setRefNote]     = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast]         = useState<ToastData | null>(null);

  // All charges with status "Billed" — ready for payment collection
  const billedFD      = (frontDeskCharges  ?? []).filter((c) => c.status === "Billed").map((c) => ({ ...c, _source: "fd"      as const }));
  const billedConsult = (consultationFees  ?? []).filter((c) => c.status === "Billed").map((c) => ({ ...c, _source: "consult" as const }));
  const billedLab     = (labCharges        ?? []).filter((c) => c.status === "Billed").map((c) => ({ ...c, _source: "lab"     as const }));
  const billedNursing = (nursingCharges    ?? []).filter((c) => c.status === "Billed").map((c) => ({ ...c, _source: "nursing" as const }));
  const billedAll: AnyCharge[] = [...billedFD, ...billedConsult, ...billedLab, ...billedNursing]
    .sort((a, b) => {
      const aDate = ("createdAt" in a ? a.createdAt : "") ?? "";
      const bDate = ("createdAt" in b ? b.createdAt : "") ?? "";
      return bDate.localeCompare(aDate);
    });

  // Recent payments (paid today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const paidToday: AnyCharge[] = [
    ...(frontDeskCharges  ?? []).filter((c) => c.status === "Paid").map((c) => ({ ...c, _source: "fd"      as const })),
    ...(consultationFees  ?? []).filter((c) => c.status === "Paid").map((c) => ({ ...c, _source: "consult" as const })),
    ...(labCharges        ?? []).filter((c) => c.status === "Paid").map((c) => ({ ...c, _source: "lab"     as const })),
    ...(nursingCharges    ?? []).filter((c) => c.status === "Paid").map((c) => ({ ...c, _source: "nursing" as const })),
  ].filter((c) => {
    const d = ("createdAt" in c ? c.createdAt : "") ?? "";
    return d.startsWith(todayStr) || d.includes("·");
  });

  function openPayment(charge: AnyCharge) {
    setTarget(charge);
    setMethod("Cash");
    setRefNote("");
  }

  function handleConfirm() {
    if (!target) return;
    setProcessing(true);
    const id = target.id;
    if (target._source === "fd")      updateFrontDeskChargeStatus(id, "Paid");
    if (target._source === "consult") updateConsultationFeeStatus(id, "Paid");
    if (target._source === "lab")     updateLabChargeStatus(id, "Paid");
    if (target._source === "nursing") updateNursingChargeStatus(id, "Paid");

    setToast({
      message: `₦${chargeAmount(target).toFixed(2)} received from ${target.patientName} via ${method}. Marked as Paid.`,
      type: "success",
    });
    setTarget(null);
    setRefNote("");
    setProcessing(false);
    void receivedBy; // used in future receipt print
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Receive Payment</h1>
        <p className="mt-1 text-sm text-slate-500">Charges sent from all departments appear below. Click a row to collect payment.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Billed charges queue ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Awaiting Payment
              {billedAll.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {billedAll.length}
                </span>
              )}
            </h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {billedAll.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No charges awaiting payment. Charges appear here after Front Desk or departments send them to Accounts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Source", "Description", "Amount", "Date", "Action"].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billedAll.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{c.patientName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            {chargeSource(c)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">
                          {chargeDescription(c)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">₦{chargeAmount(c).toFixed(2)}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                          {fmtDate("createdAt" in c ? c.createdAt ?? "" : "")}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" onClick={() => openPayment(c)}>Collect Payment</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Paid today sidebar ── */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">
            Paid Today
            {paidToday.length > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {paidToday.length}
              </span>
            )}
          </h3>
          <div className="space-y-2.5">
            {paidToday.length === 0 ? (
              <p className="text-xs text-slate-400">No payments collected today yet.</p>
            ) : (
              paidToday.map((c) => (
                <div key={c.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{c.patientName}</span>
                    <span className="font-bold text-emerald-700">₦{chargeAmount(c).toFixed(2)}</span>
                  </div>
                  <p className="mt-0.5 text-slate-400">{chargeSource(c)}</p>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Total collected today</span>
              <span className="font-bold text-slate-900">
                ₦{paidToday.reduce((s, c) => s + chargeAmount(c), 0).toFixed(2)}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Payment modal ── */}
      {target && (
        <Modal open={true} onClose={() => !processing && setTarget(null)} title="Collect Payment">
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="font-semibold">{target.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="font-semibold">{chargeSource(target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Description</span>
                <span className="text-right text-xs">
                  {chargeDescription(target)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">Amount Due</span>
                <span className="text-lg font-black text-slate-900">₦{chargeAmount(target).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Cash", "POS / Card", "Mobile Money", "Insurance"] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                      method === m
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
                        : "border-slate-100 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    {m}
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
                placeholder="Transaction reference or note…"
                className={inputCls}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setTarget(null)} disabled={processing}>Cancel</Button>
            <Button size="md" onClick={handleConfirm} disabled={processing}>
              {processing ? "Processing…" : "Confirm — Mark as Paid"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
