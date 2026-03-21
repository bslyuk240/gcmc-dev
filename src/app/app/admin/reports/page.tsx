"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { fetchInvoices, fetchPayments, type InvoiceRecord, type PaymentRecord } from "@/lib/supabase/db";

function money(value: number) {
  return `NGN ${value.toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AdminReportsPage() {
  const { frontDeskCharges, consultationFees, supplierPayments, payrollBatches, kioskSales, labCharges, nursingCharges, metrics } =
    useAccountsStore();
  const { bills: pharmacyBills, metrics: pharmacyMetrics } = usePharmacyStore();
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRecord[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    let alive = true;

    const loadInvoices = async () => {
      try {
        const [rows, payments] = await Promise.all([fetchInvoices(), fetchPayments()]);
        if (!alive) return;
        setInvoiceRows(rows);
        setInvoicePayments(payments);
      } catch (error) {
        if (!alive) return;
        console.error("[admin-reports] invoice load failed:", error);
      }
    };

    void loadInvoices();
    const refresh = () => {
      void loadInvoices();
    };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);

    return () => {
      alive = false;
      window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    };
  }, []);

  const invoiceRevenueToday = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return invoicePayments
      .filter((payment) => payment.paidAt.startsWith(todayIso))
      .reduce((sum, payment) => sum + payment.amount, 0);
  }, [invoicePayments]);

  const invoicePendingBalance = useMemo(
    () =>
      invoiceRows
        .filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled")
        .reduce((sum, invoice) => sum + Math.max(0, invoice.amountDue - invoice.amountPaid), 0),
    [invoiceRows],
  );

  const invoicePendingCount = useMemo(
    () => invoiceRows.filter((invoice) => invoice.status !== "paid" && invoice.status !== "cancelled").length,
    [invoiceRows],
  );

  const reportCatalog = useMemo(
    () => [
      {
        title: "Daily Finance",
        description: "Live collections, pending balances, and source totals.",
        href: "/app/accounts/daily-reports",
        accent: "bg-emerald-100 text-emerald-700",
      },
      {
        title: "Collections Queue",
        description: "Open invoices and department charges awaiting payment.",
        href: "/app/accounts/receive-payment",
        accent: "bg-sky-100 text-sky-700",
      },
      {
        title: "Payroll Oversight",
        description: "Department payroll batches, approvals, and disbursement status.",
        href: "/app/accounts/payroll",
        accent: "bg-violet-100 text-violet-700",
      },
      {
        title: "Inventory & Pharmacy",
        description: "Bills, restocks, and stock pressure across pharmacy operations.",
        href: "/app/admin/pharmacy",
        accent: "bg-orange-100 text-orange-700",
      },
      {
        title: "HR & Staffing",
        description: "Leave, onboarding, and payroll preparation activity.",
        href: "/app/admin/hr",
        accent: "bg-blue-100 text-blue-700",
      },
    ],
    [],
  );

  const sources = useMemo(() => {
    const frontDeskPaid = frontDeskCharges.filter((item) => item.status === "Paid");
    const consultationPaid = consultationFees.filter((item) => item.status === "Paid");
    const labPaid = labCharges.filter((item) => item.status === "Paid");
    const nursingPaid = nursingCharges.filter((item) => item.status === "Paid");
    const pharmacyPaid = pharmacyBills.filter((item) => item.billStatus === "Paid");
    const kioskConfirmed = kioskSales.filter((item) => item.status === "Confirmed");
    const supplierPaid = supplierPayments.filter((item) => item.status === "Paid");
    const payrollPaid = payrollBatches.filter((item) => item.status === "Paid");

    return [
      { label: "Front Desk", total: frontDeskPaid.reduce((sum, item) => sum + item.amount, 0), count: frontDeskPaid.length, href: "/app/accounts/receive-payment" },
      { label: "Consultation", total: consultationPaid.reduce((sum, item) => sum + item.fee, 0), count: consultationPaid.length, href: "/app/accounts/consultation-fees" },
      { label: "Lab", total: labPaid.reduce((sum, item) => sum + item.amount, 0), count: labPaid.length, href: "/app/accounts/lab-billing" },
      { label: "Nursing", total: nursingPaid.reduce((sum, item) => sum + item.amount, 0), count: nursingPaid.length, href: "/app/accounts/nursing-billing" },
      { label: "Pharmacy", total: pharmacyPaid.reduce((sum, item) => sum + item.totalCost, 0), count: pharmacyPaid.length, href: "/app/accounts/pharmacy-billing" },
      { label: "Invoices", total: invoiceRevenueToday, count: invoicePayments.filter((payment) => payment.paidAt.startsWith(new Date().toISOString().slice(0, 10))).length, href: "/app/accounts/invoices" },
      { label: "Kiosk", total: kioskConfirmed.reduce((sum, item) => sum + item.totalRevenue, 0), count: kioskConfirmed.length, href: "/app/accounts/kiosk" },
      { label: "Supplier Payments", total: supplierPaid.reduce((sum, item) => sum + item.amount, 0), count: supplierPaid.length, href: "/app/accounts/supplier-payments" },
      { label: "Payroll", total: payrollPaid.reduce((sum, item) => sum + item.totalAmount, 0), count: payrollPaid.length, href: "/app/accounts/payroll" },
    ]
      .filter((item) => item.total > 0 || item.count > 0)
      .sort((left, right) => right.total - left.total);
  }, [consultationFees, frontDeskCharges, invoicePayments, kioskSales, labCharges, nursingCharges, payrollBatches, pharmacyBills, supplierPayments, invoiceRevenueToday]);

  const recentActivity = useMemo(() => {
    const items = [
      ...frontDeskCharges.slice(0, 2).map((item) => ({
        source: "Front Desk",
        name: item.patientName,
        detail: item.description,
        amount: item.amount,
        time: item.paidAt ?? item.createdAt,
        status: item.status,
      })),
      ...consultationFees.slice(0, 2).map((item) => ({
        source: "Consultation",
        name: item.patientName,
        detail: item.consultationType,
        amount: item.fee,
        time: item.paidAt ?? item.consultedAt,
        status: item.status,
      })),
      ...labCharges.slice(0, 2).map((item) => ({
        source: "Lab",
        name: item.patientName,
        detail: item.testName,
        amount: item.amount,
        time: item.paidAt ?? item.completedAt,
        status: item.status,
      })),
      ...nursingCharges.slice(0, 2).map((item) => ({
        source: "Nursing",
        name: item.patientName,
        detail: item.procedureType,
        amount: item.amount,
        time: item.paidAt ?? item.performedAt,
        status: item.status,
      })),
      ...pharmacyBills.slice(0, 2).map((item) => ({
        source: "Pharmacy",
        name: item.patientName,
        detail: item.source,
        amount: item.totalCost,
        time: item.paidAt ?? item.dispensedAt,
        status: item.billStatus,
      })),
      ...invoicePayments.slice(0, 2).map((item) => ({
        source: "Invoice",
        name: invoiceRows.find((invoice) => invoice.id === item.invoiceId)?.invoiceNumber ?? item.invoiceId,
        detail: item.paymentMethod,
        amount: item.amount,
        time: item.paidAt,
        status: "Paid",
      })),
    ];

    return items
      .sort((left, right) => new Date(right.time).getTime() - new Date(left.time).getTime())
      .slice(0, 10);
  }, [consultationFees, frontDeskCharges, invoicePayments, labCharges, nursingCharges, pharmacyBills]);

  const revenueToday =
    metrics.revenueToday +
    pharmacyMetrics.revenueCollected +
    invoiceRevenueToday;
  const collectedToday =
    metrics.frontDeskPaidToday +
    metrics.labPaidToday +
    metrics.nursingPaidToday +
    metrics.kioskRevenueToday +
    pharmacyMetrics.revenueCollected +
    invoiceRevenueToday;
  const pendingTotal =
    metrics.frontDeskPendingValue +
    metrics.consultationPendingValue +
    metrics.supplierPendingValue +
    metrics.payrollPendingValue +
    metrics.labPendingValue +
    metrics.nursingPendingValue +
    pharmacyMetrics.pendingBillValue +
    invoicePendingBalance;
  const openQueues =
    metrics.frontDeskPendingCount +
    metrics.consultationPendingCount +
    metrics.labPendingCount +
    metrics.nursingPendingCount +
    pharmacyMetrics.pendingBills +
    invoicePendingCount;

  function downloadSnapshot() {
    const snapshot = [
      "GCMC Admin Financial Summary",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Revenue Today: ${money(revenueToday)}`,
      `Collected Today: ${money(collectedToday)}`,
      `Pending Total: ${money(pendingTotal)}`,
      `Open Queues: ${openQueues}`,
      "",
      "Source Totals:",
      ...sources.map((source) => `${source.label}: ${money(source.total)} (${source.count})`),
      "",
      "Recent Activity:",
      ...recentActivity.map((item) => `${item.source} | ${item.name} | ${item.detail} | ${money(item.amount)} | ${formatDateTime(item.time)} | ${item.status}`),
    ].join("\n");

    const blob = new Blob([snapshot], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gcmc-admin-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Reports"
        description="Live financial, pharmacy, and operational summaries for hospital administration."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadSnapshot}>Download Snapshot</Button>
            <Button asChild>
              <Link href="/app/admin/accounts">Open Admin Accounts</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue Today", value: money(revenueToday), sub: "Billing + pharmacy + invoices", color: "text-emerald-700" },
          { label: "Collected Today", value: money(collectedToday), sub: "Confirmed receipts", color: "text-slate-900" },
          { label: "Pending Total", value: money(pendingTotal), sub: "Outstanding balances", color: "text-amber-700" },
          { label: "Open Queues", value: openQueues, sub: "Items awaiting payment", color: "text-violet-700" },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Report Library</h3>
          <p className="mt-1 text-sm text-slate-500">Jump to the live source pages that feed the admin summary.</p>
          <div className="mt-4 space-y-3">
            {reportCatalog.map((report) => (
              <Link
                key={report.title}
                href={report.href}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{report.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${report.accent}`}>Open</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Revenue by Source</h3>
          <p className="mt-1 text-sm text-slate-500">Live totals from the Accounts and Pharmacy modules.</p>
          <div className="mt-4 space-y-3">
            {sources.map((source) => (
              <div key={source.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{source.label}</p>
                    <p className="text-xs text-slate-500">{source.count} receipts confirmed</p>
                  </div>
                  <p className="font-bold text-slate-900">{money(source.total)}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (source.total / Math.max(revenueToday, 1)) * 100)}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={source.href}>Open source</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">Recent Financial Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Source", "Name", "Details", "Amount", "Time", "Status"].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivity.map((item, index) => (
                  <tr key={`${item.source}-${index}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">{item.source}</td>
                    <td className="px-5 py-3 text-slate-700">{item.name}</td>
                    <td className="px-5 py-3 text-slate-500">{item.detail}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{money(item.amount)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDateTime(item.time)}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.status === "Paid" || item.status === "Confirmed"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "Pending" || item.status === "Billed"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentActivity.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-center text-sm text-slate-400" colSpan={6}>
                      No financial activity found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Quick Drilldown</h3>
          <p className="mt-1 text-sm text-slate-500">Jump directly into the live operational screens.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Receive Payment", href: "/app/accounts/receive-payment" },
              { label: "Invoices", href: "/app/accounts/invoices" },
              { label: "Consultation Fees", href: "/app/accounts/consultation-fees" },
              { label: "Lab Billing", href: "/app/accounts/lab-billing" },
              { label: "Nursing Billing", href: "/app/accounts/nursing-billing" },
              { label: "Pharmacy Billing", href: "/app/accounts/pharmacy-billing" },
              { label: "Payroll", href: "/app/accounts/payroll" },
              { label: "Kiosk Revenue", href: "/app/accounts/kiosk" },
              { label: "Supplier Payments", href: "/app/accounts/supplier-payments" },
              { label: "Daily Reports", href: "/app/accounts/daily-reports" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Invoice pending balance</span>
              <span className="font-semibold text-slate-900">{money(invoicePendingBalance)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pharmacy revenue collected</span>
              <span className="font-semibold text-emerald-700">{money(pharmacyMetrics.revenueCollected)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payroll pending</span>
              <span className="font-semibold text-slate-900">{money(metrics.payrollPendingValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Supplier payables</span>
              <span className="font-semibold text-slate-900">{money(metrics.supplierPendingValue)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
