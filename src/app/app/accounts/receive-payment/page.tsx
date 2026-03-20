"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Toast, type ToastData } from "@/components/ui/toast";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
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
import { updateBillStatus, type PharmacyBill } from "@/lib/data/pharmacy-store";
import {
  fetchInvoices,
  fetchPayments,
  recordInvoicePayment,
  type InvoiceRecord,
  type PaymentRecord,
} from "@/lib/supabase/db";
import { useHMSSession } from "@/modules/rbac/hooks";

type AnyCharge =
  | (FrontDeskCharge & { _source: "fd" })
  | (ConsultationFee & { _source: "consult" })
  | (LabCharge & { _source: "lab" })
  | (NursingCharge & { _source: "nursing" })
  | (PharmacyBill & { _source: "pharmacy" });

type PayMethod = "Cash" | "POS / Card" | "Mobile Money" | "Insurance";

type PaymentTarget =
  | { kind: "charge"; charge: AnyCharge }
  | { kind: "invoice"; invoice: InvoiceRecord };

function fmtDate(value: string) {
  if (!value) return "—";
  if (!value.includes("T")) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      });
}

function chargeSource(charge: AnyCharge): string {
  if (charge._source === "fd") return "Front Desk";
  if (charge._source === "consult") return "Consultation";
  if (charge._source === "lab") return "Laboratory";
  if (charge._source === "pharmacy") return "Pharmacy";
  return "Nursing";
}

function chargeAmount(charge: AnyCharge): number {
  if (charge._source === "consult") return charge.fee;
  if (charge._source === "pharmacy") return charge.totalCost;
  return charge.amount;
}

function chargeDescription(charge: AnyCharge): string {
  if (charge._source === "fd") return charge.description;
  if (charge._source === "consult") return `${charge.consultationType} consultation`;
  if (charge._source === "lab") return charge.testName;
  if (charge._source === "pharmacy") return charge.drugs;
  return charge.description || charge.procedureType;
}

function chargeTimestamp(charge: AnyCharge): string {
  if (charge._source === "consult") return charge.paidAt ?? charge.consultedAt ?? "";
  if (charge._source === "lab") return charge.paidAt ?? charge.completedAt ?? "";
  if (charge._source === "nursing") return charge.paidAt ?? charge.performedAt ?? "";
  if (charge._source === "pharmacy") return charge.paidAt ?? charge.dispensedAt ?? "";
  return charge.paidAt ?? charge.createdAt ?? "";
}

function paymentMethodToDb(method: PayMethod): PaymentRecord["paymentMethod"] {
  switch (method) {
    case "Cash":
      return "cash";
    case "POS / Card":
      return "card";
    case "Mobile Money":
      return "mobile";
    case "Insurance":
      return "other";
  }
}

function invoiceBalance(invoice: InvoiceRecord) {
  return Math.max(0, Number((invoice.amountDue - invoice.amountPaid).toFixed(2)));
}

export default function ReceivePaymentPage() {
  const { frontDeskCharges, consultationFees, labCharges, nursingCharges } = useAccountsStore();
  const { bills: pharmacyBills } = usePharmacyStore();
  const searchParams = useSearchParams();
  const session = useHMSSession();
  const receivedBy = session?.full_name ?? "Accounts";

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [target, setTarget] = useState<PaymentTarget | null>(null);
  const [method, setMethod] = useState<PayMethod>("Cash");
  const [refNote, setRefNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [autoOpenedInvoice, setAutoOpenedInvoice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const loadPaymentData = async () => {
      setInvoiceLoading(true);
      try {
        const [invoiceRows, paymentRows] = await Promise.all([fetchInvoices(), fetchPayments()]);
        if (!alive) return;
        setInvoices(invoiceRows);
        setPayments(paymentRows);
      } catch (error) {
        if (!alive) return;
        setToast({
          message: error instanceof Error ? error.message : "Failed to load payment data.",
          type: "error",
        });
      } finally {
        if (alive) setInvoiceLoading(false);
      }
    };

    void loadPaymentData();
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, loadPaymentData);

    return () => {
      alive = false;
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, loadPaymentData);
    };
  }, []);

  useEffect(() => {
    const invoiceParam = searchParams.get("invoice")?.trim();
    if (!invoiceParam || autoOpenedInvoice === invoiceParam) return;

    const match = invoices.find(
      (invoice) =>
        invoice.invoiceNumber.toLowerCase() === invoiceParam.toLowerCase() ||
        invoice.id === invoiceParam,
    );

    if (match) {
      setTarget({ kind: "invoice", invoice: match });
      setMethod("Cash");
      setRefNote("");
      setAutoOpenedInvoice(invoiceParam);
    }
  }, [searchParams, invoices, autoOpenedInvoice]);

  const billedFD = (frontDeskCharges ?? [])
    .filter((charge) => charge.status === "Billed")
    .map((charge) => ({ ...charge, _source: "fd" as const }));
  const billedConsult = (consultationFees ?? [])
    .filter((charge) => charge.status === "Billed")
    .map((charge) => ({ ...charge, _source: "consult" as const }));
  const billedLab = (labCharges ?? [])
    .filter((charge) => charge.status === "Billed")
    .map((charge) => ({ ...charge, _source: "lab" as const }));
  const billedNursing = (nursingCharges ?? [])
    .filter((charge) => charge.status === "Billed")
    .map((charge) => ({ ...charge, _source: "nursing" as const }));
  const billedPharmacy = (pharmacyBills ?? [])
    .filter((bill) => bill.billStatus === "Pending")
    .map((bill) => ({ ...bill, _source: "pharmacy" as const }));

  const billedAll: AnyCharge[] = useMemo(
    () =>
      [...billedFD, ...billedConsult, ...billedLab, ...billedNursing, ...billedPharmacy].sort((a, b) => {
        const aDate = ("createdAt" in a ? a.createdAt : "dispensedAt" in a ? a.dispensedAt : "") ?? "";
        const bDate = ("createdAt" in b ? b.createdAt : "dispensedAt" in b ? b.dispensedAt : "") ?? "";
        return bDate.localeCompare(aDate);
      }),
    [billedFD, billedConsult, billedLab, billedNursing, billedPharmacy],
  );

  const pendingInvoices = useMemo(
    () =>
      [...invoices]
        .filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [invoices],
  );

  const _paidToday: AnyCharge[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [
      ...(frontDeskCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "fd" as const })),
      ...(consultationFees ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "consult" as const })),
      ...(labCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "lab" as const })),
      ...(nursingCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "nursing" as const })),
      ...(pharmacyBills ?? [])
        .filter((bill) => bill.billStatus === "Paid")
        .map((bill) => ({ ...bill, _source: "pharmacy" as const })),
    ].filter((charge) => {
      const date = chargeTimestamp(charge);
      return date.startsWith(todayStr) || date.includes("·");
    });
  }, [frontDeskCharges, consultationFees, labCharges, nursingCharges, pharmacyBills]);

  const paidTodayResolved: AnyCharge[] = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [
      ...(frontDeskCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "fd" as const })),
      ...(consultationFees ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "consult" as const })),
      ...(labCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "lab" as const })),
      ...(nursingCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({ ...charge, _source: "nursing" as const })),
      ...(pharmacyBills ?? [])
        .filter((bill) => bill.billStatus === "Paid")
        .map((bill) => ({ ...bill, _source: "pharmacy" as const })),
    ].filter((charge) => {
      const date = chargeTimestamp(charge);
      return date.startsWith(todayStr) || date.includes("·");
    });
  }, [frontDeskCharges, consultationFees, labCharges, nursingCharges, pharmacyBills]);
  void _paidToday;

  const invoicePaymentsToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

    return payments
      .map((payment) => {
        const invoice = invoicesById.get(payment.invoiceId);
        return {
          ...payment,
          invoiceNumber: invoice?.invoiceNumber ?? payment.invoiceId,
          patient: invoice?.patient ?? "Unknown patient",
          services: invoice?.items ?? "Invoice payment",
        };
      })
      .filter((payment) => payment.paidAt.startsWith(todayStr));
  }, [invoices, payments]);

  const collectedReceiptsToday = paidTodayResolved.length + invoicePaymentsToday.length;
  const collectedAmountToday =
    paidTodayResolved.reduce((sum, charge) => sum + chargeAmount(charge), 0) +
    invoicePaymentsToday.reduce((sum, payment) => sum + payment.amount, 0);

  function openChargePayment(charge: AnyCharge) {
    setTarget({ kind: "charge", charge });
    setMethod("Cash");
    setRefNote("");
  }

  function openInvoicePayment(invoice: InvoiceRecord) {
    setTarget({ kind: "invoice", invoice });
    setMethod("Cash");
    setRefNote("");
  }

  async function handleConfirm() {
    if (!target) return;
    setProcessing(true);

    try {
      if (target.kind === "charge") {
        const id = target.charge.id;
        const paidAt = new Date().toISOString();

        // All store mutations are now synchronous optimistic updates — fire and move on
        if (target.charge._source === "fd") updateFrontDeskChargeStatus(id, "Paid", { paidAt, paymentMethod: method });
        if (target.charge._source === "consult") updateConsultationFeeStatus(id, "Paid", { paidAt, paymentMethod: method });
        if (target.charge._source === "lab") updateLabChargeStatus(id, "Paid", { paidAt, paymentMethod: method });
        if (target.charge._source === "nursing") updateNursingChargeStatus(id, "Paid", { paidAt, paymentMethod: method });
        if (target.charge._source === "pharmacy") updateBillStatus(id, "Paid", { paidAt, paymentMethod: method });

        window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));

        setToast({
          message: `NGN ${chargeAmount(target.charge).toFixed(2)} received from ${target.charge.patientName} via ${method}. Marked as Paid.`,
          type: "success",
        });
      } else {
        const amount = invoiceBalance(target.invoice);
        const { invoice: updated, payment } = await recordInvoicePayment(
          target.invoice,
          amount,
          paymentMethodToDb(method),
          refNote.trim() || `${method} payment recorded by ${receivedBy}`,
        );

        setPayments((previous) => [payment, ...previous]);
        setInvoices((previous) =>
          previous.map((invoice) => (invoice.id === updated.id ? updated : invoice)),
        );
        window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));

        setToast({
          message: `NGN ${amount.toFixed(2)} received for invoice ${updated.invoiceNumber}. Marked as ${updated.status}.`,
          type: "success",
        });
      }

      setTarget(null);
      setRefNote("");
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to record payment.",
        type: "error",
      });
    } finally {
      setProcessing(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Receive Payment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Charges sent from all departments and invoices from Accounts appear below. Click a row to collect payment.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Awaiting Payment
              {billedAll.length > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {billedAll.length} items
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
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Source", "Description", "Amount", "Date", "Action"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billedAll.map((charge) => (
                      <tr key={charge.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-semibold text-slate-900">{charge.patientName}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                            {chargeSource(charge)}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500">
                          {chargeDescription(charge)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">NGN {chargeAmount(charge).toFixed(2)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                          {fmtDate("createdAt" in charge ? charge.createdAt ?? "" : "")}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" onClick={() => openChargePayment(charge)}>
                            Collect Payment
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                Invoices Awaiting Payment
                {pendingInvoices.length > 0 && (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">
                    {pendingInvoices.length}
                  </span>
                )}
              </h3>
              {invoiceLoading ? <span className="text-xs text-slate-400">Loading...</span> : null}
            </div>

            {pendingInvoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No unpaid invoices found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Invoice", "Patient", "Services", "Balance", "Due Date", "Action"].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingInvoices.map((invoice) => {
                      const balance = invoiceBalance(invoice);
                      return (
                        <tr key={invoice.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{invoice.invoiceNumber}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{invoice.patient}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500">{invoice.items}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">NGN {balance.toLocaleString()}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{fmtDate(invoice.dueDate)}</td>
                          <td className="px-4 py-3">
                            <Button size="sm" onClick={() => openInvoicePayment(invoice)}>
                              Collect Payment
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">
            Paid Today
            {collectedReceiptsToday > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {collectedReceiptsToday} receipts
              </span>
            )}
          </h3>
          <div className="space-y-2.5">
            {invoicePaymentsToday.length === 0 && paidTodayResolved.length === 0 ? (
              <p className="text-xs text-slate-400">No payments collected today yet.</p>
            ) : null}
            {invoicePaymentsToday.map((payment) => (
              <div key={payment.id} className="rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">{payment.patient}</span>
                  <span className="font-bold text-violet-700">NGN {payment.amount.toFixed(2)}</span>
                </div>
                <p className="mt-0.5 text-slate-500">
                  Invoice {payment.invoiceNumber} {payment.services ? `· ${payment.services}` : ""}
                </p>
              </div>
            ))}
            {paidTodayResolved.map((charge) => (
              <div key={charge.id} className="rounded-lg bg-slate-50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{charge.patientName}</span>
                  <span className="font-bold text-emerald-700">NGN {chargeAmount(charge).toFixed(2)}</span>
                </div>
                <p className="mt-0.5 text-slate-400">{chargeSource(charge)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Total collected today</span>
              <span className="font-bold text-slate-900">
                NGN {collectedAmountToday.toFixed(2)}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {target && (
        <Modal
          open={true}
          onClose={() => !processing && setTarget(null)}
          title={target.kind === "invoice" ? "Collect Invoice Payment" : "Collect Payment"}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
              {target.kind === "charge" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient</span>
                    <span className="font-semibold">{target.charge.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source</span>
                    <span className="font-semibold">{chargeSource(target.charge)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Description</span>
                    <span className="text-right text-xs">{chargeDescription(target.charge)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">Amount Due</span>
                    <span className="text-lg font-black text-slate-900">
                      NGN {chargeAmount(target.charge).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-semibold">{target.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient</span>
                    <span className="font-semibold">{target.invoice.patient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Services</span>
                    <span className="text-right text-xs">{target.invoice.items}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">Balance Due</span>
                    <span className="text-lg font-black text-slate-900">
                      NGN {invoiceBalance(target.invoice).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
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
                className={inputCls}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="ghost" size="md" onClick={() => setTarget(null)} disabled={processing}>
              Cancel
            </Button>
            <Button size="md" onClick={handleConfirm} disabled={processing}>
              {processing ? "Processing..." : "Confirm Payment Received"}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

