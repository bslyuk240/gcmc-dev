"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { fetchInvoices, fetchPayments, type PaymentRecord } from "@/lib/supabase/db";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";

type HistoryRow = {
  id: string;
  source: "invoice" | "charge";
  reference: string;
  patient: string;
  services: string;
  amount: number;
  method: string;
  paidAt: string;
  status: string;
};

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function formatMethod(method: PaymentRecord["paymentMethod"]) {
  switch (method) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "transfer":
      return "Transfer";
    case "mobile":
      return "Mobile Money";
    default:
      return "Other";
  }
}

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AccountsPaymentsHistoryPage() {
  const { frontDeskCharges, consultationFees, labCharges, nursingCharges } = useAccountsStore();
  const [invoicePayments, setInvoicePayments] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [paymentRows, invoiceRows] = await Promise.all([fetchPayments(), fetchInvoices()]);
        if (!alive) return;

        const invoicesById = new Map(invoiceRows.map((invoice) => [invoice.id, invoice]));
        const rows: HistoryRow[] = paymentRows.map((payment) => {
          const invoice = invoicesById.get(payment.invoiceId);
          return {
            id: payment.id,
            source: "invoice",
            reference: invoice?.invoiceNumber ?? payment.invoiceId,
            patient: invoice?.patient ?? "Unknown patient",
            services: invoice?.items ?? "Invoice payment",
            amount: payment.amount,
            method: formatMethod(payment.paymentMethod),
            paidAt: payment.paidAt,
            status: invoice?.status ?? "unknown",
          };
        });
        setInvoicePayments(rows);
      } catch (error) {
        if (!alive) return;
        setToast({
          message: error instanceof Error ? error.message : "Failed to load payment history.",
          type: "error",
        });
      } finally {
        if (alive) setLoading(false);
      }
    };

    void loadData();
    const refresh = () => {
      void loadData();
    };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);

    return () => {
      alive = false;
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    };
  }, []);

  const chargePayments = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [
      ...(frontDeskCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({
          id: `fd-${charge.id}`,
          source: "charge" as const,
          reference: charge.description || charge.chargeType,
          patient: charge.patientName,
          services: `Front Desk: ${charge.description || charge.chargeType}`,
          amount: charge.amount,
          method: charge.paymentMethod ?? "Cash",
          paidAt: charge.paidAt ?? charge.createdAt,
          status: "Paid",
        })),
      ...(consultationFees ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({
          id: `consult-${charge.id}`,
          source: "charge" as const,
          reference: `${charge.consultationType} consultation`,
          patient: charge.patientName,
          services: `Consultation with ${charge.doctorName}`,
          amount: charge.fee,
          method: charge.paymentMethod ?? "Cash",
          paidAt: charge.paidAt ?? charge.consultedAt,
          status: "Paid",
        })),
      ...(labCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({
          id: `lab-${charge.id}`,
          source: "charge" as const,
          reference: charge.testName,
          patient: charge.patientName,
          services: `Laboratory: ${charge.testName}`,
          amount: charge.amount,
          method: charge.paymentMethod ?? "Cash",
          paidAt: charge.paidAt ?? charge.completedAt,
          status: "Paid",
        })),
      ...(nursingCharges ?? [])
        .filter((charge) => charge.status === "Paid")
        .map((charge) => ({
          id: `nursing-${charge.id}`,
          source: "charge" as const,
          reference: charge.procedureType,
          patient: charge.patientName,
          services: `Nursing: ${charge.description || charge.procedureType}`,
          amount: charge.amount,
          method: charge.paymentMethod ?? "Cash",
          paidAt: charge.paidAt ?? charge.performedAt,
          status: "Paid",
        })),
    ];

    return rows;
  }, [frontDeskCharges, consultationFees, labCharges, nursingCharges]);

  const payments = useMemo(
    () => [...invoicePayments, ...chargePayments].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    [invoicePayments, chargePayments],
  );

  const summary = useMemo(() => {
    const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayTotal = payments.reduce((sum, payment) => {
      return payment.paidAt.startsWith(today) ? sum + payment.amount : sum;
    }, 0);
    return {
      total,
      todayTotal,
      count: payments.length,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment History"
        description="Invoice and charge payments recorded by Accounts."
        action={<Button href={`${INTERNAL_PREFIX}/accounts/receive-payment`}>Open Receive Payment</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Payments</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">NGN {summary.total.toLocaleString()}</p>
        </Card>
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paid Today</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">NGN {summary.todayTotal.toLocaleString()}</p>
        </Card>
        <Card className="card-hover">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payment Count</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.count}</p>
        </Card>
      </div>

      <div className="space-y-3 md:hidden">
        {payments.map((payment) => (
          <Card key={payment.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{payment.patient}</p>
                <p className="text-xs font-mono text-slate-500">{payment.reference}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {payment.status}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <MobileMeta label="Date" value={formatDateTime(payment.paidAt)} />
              <MobileMeta label="Services" value={payment.services} />
              <MobileMeta label="Amount" value={`NGN ${payment.amount.toLocaleString()}`} />
              <MobileMeta label="Method" value={payment.method} />
            </div>
          </Card>
        ))}
        {payments.length === 0 && !loading ? (
          <Card className="p-6 text-center text-sm text-slate-400">No payment records yet.</Card>
        ) : null}
      </div>

      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Recent Payments</h3>
          {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Date", "Reference", "Patient", "Services", "Amount", "Method", "Status"].map((heading) => (
                  <th
                    key={heading}
                    className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                    {formatDateTime(payment.paidAt)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{payment.reference}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{payment.patient}</td>
                  <td className="max-w-[220px] truncate px-5 py-3 text-slate-500">{payment.services}</td>
                  <td className="px-5 py-3 font-bold text-slate-900">NGN {payment.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-slate-600">{payment.method}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No payment records yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> invoice is created in <Link href={`${INTERNAL_PREFIX}/accounts/invoices`} className="text-accent hover:underline">Invoices</Link> {"->"}
        payment is collected in <Link href={`${INTERNAL_PREFIX}/accounts/receive-payment`} className="text-accent hover:underline">Receive Payment</Link> {"->"}
        the transaction lands here.
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
