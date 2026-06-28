"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { fetchInvoices, fetchPayments, type InvoiceRecord, type PaymentRecord } from "@/lib/supabase/db";

const STATUS_STYLES: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Overdue: "bg-red-50 text-red-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  Submitted: "bg-sky-50 text-sky-700",
  Approved: "bg-violet-50 text-violet-700",
  Draft: "bg-slate-100 text-slate-600",
};

export default function AccountsDashboardPage() {
  const { frontDeskCharges, consultationFees, supplierPayments, payrollBatches, kioskSales, metrics, nursingCharges, labCharges } = useAccountsStore();
  const { prescriptions } = usePharmacyStore();
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRecord[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      try {
        const [rows, payments] = await Promise.all([fetchInvoices(), fetchPayments()]);
        if (!alive) return;
        setInvoiceRows(rows);
        setInvoicePayments(payments);
      } catch (error) {
        if (!alive) return;
        console.error("[accounts-dashboard] invoice payment load failed:", error);
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

  const todayIso = new Date().toISOString().slice(0, 10);
  const invoiceRevenueToday = useMemo(
    () => invoicePayments.filter((payment) => payment.paidAt.startsWith(todayIso)).reduce((sum, payment) => sum + payment.amount, 0),
    [invoicePayments, todayIso],
  );
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

  const pendingFD = frontDeskCharges.filter((c) => c.status === "Pending" || c.status === "Billed").slice(0, 4);
  const pendingCF = consultationFees.filter((c) => c.status === "Pending").slice(0, 3);
  const pendingPayroll = payrollBatches.filter((b) => b.status === "Submitted");
  const pendingSupplier = supplierPayments.filter((p) => p.status === "Pending").slice(0, 3);
  const recentKiosk = kioskSales.slice(0, 3);

  const dispensedRx = prescriptions.filter((p) => p.status === "Dispensed");
  const pharmacyRevToday = dispensedRx.reduce((s, p) => s + (p.totalCost ?? 0), 0);

  // P&L calculation
  const totalRevenue =
    metrics.frontDeskPaidToday +
    consultationFees.filter((f) => f.status === "Paid").reduce((s, f) => s + f.fee, 0) +
    invoiceRevenueToday +
    (labCharges ?? []).filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0) +
    (nursingCharges ?? []).filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0) +
    metrics.kioskRevenueToday +
    pharmacyRevToday;

  const totalExpenses =
    supplierPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0) +
    payrollBatches.filter((b) => b.status === "Paid").reduce((s, b) => s + b.totalAmount, 0);

  const netPL = totalRevenue - totalExpenses;

  const totalPendingAmount =
    metrics.frontDeskPendingValue +
    metrics.consultationPendingValue +
    metrics.supplierPendingValue +
    invoicePendingBalance;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Accounts Dashboard"
        description="Live financial hub — revenue, receivables, payroll, and department cash flows."
      />

      {/* Alerts strip */}
      {(pendingPayroll.length > 0 || metrics.supplierPendingCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingPayroll.length > 0 && (
            <Link href={`${INTERNAL_PREFIX}/accounts/payroll`}
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              {pendingPayroll.length} payroll batch{pendingPayroll.length > 1 ? "es" : ""} awaiting approval —
              ₦{pendingPayroll.reduce((s, b) => s + b.totalAmount, 0).toLocaleString()}
            </Link>
          )}
          {metrics.supplierPendingCount > 0 && (
            <Link href={`${INTERNAL_PREFIX}/accounts/supplier-payments`}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {metrics.supplierPendingCount} supplier payment{metrics.supplierPendingCount > 1 ? "s" : ""} pending —
              ₦{metrics.supplierPendingValue.toLocaleString()}
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Revenue Today", value: `₦${totalRevenue.toLocaleString()}`, sub: "Front Desk + Consult + Invoice + Kiosk", color: "text-emerald-700" },
          { label: "Pending Collections", value: `₦${totalPendingAmount.toLocaleString()}`, sub: `${metrics.frontDeskPendingCount + metrics.consultationPendingCount + invoicePendingCount} unpaid items`, color: "text-amber-600" },
          { label: "Payroll Pending", value: `₦${metrics.payrollPendingValue.toLocaleString()}`, sub: `${metrics.payrollPendingCount} batch(es) to disburse`, color: "text-sky-700" },
          { label: "Supplier Payable", value: `₦${metrics.supplierPendingValue.toLocaleString()}`, sub: `${metrics.supplierPendingCount} outstanding invoices`, color: metrics.supplierPendingCount > 0 ? "text-red-600" : "text-slate-900" },
        ].map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{k.label}</p>
            <p className={`mt-1 text-xl font-bold sm:text-2xl ${k.color}`}>{k.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* Front Desk charges */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Front Desk Charges</h3>
                <p className="text-xs text-slate-400 mt-0.5">Registration and visit fees from Front Desk</p>
              </div>
              <Link href={`${INTERNAL_PREFIX}/accounts/invoices`} className="text-sm font-semibold text-accent hover:underline">All invoices →</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingFD.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{c.patientName}</p>
                    <p className="text-xs text-slate-400">{c.chargeType} · {c.createdAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 text-sm">₦{c.amount}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                  </div>
                </div>
              ))}
              {pendingFD.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No pending Front Desk charges.</p>
              )}
            </div>
          </Card>

          {/* Consultation Fees */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Doctor Consultation Fees</h3>
                <p className="text-xs text-slate-400 mt-0.5">Fees billed by doctors after consultations</p>
              </div>
              <Link href={`${INTERNAL_PREFIX}/accounts/cash-desk`} className="text-sm font-semibold text-accent hover:underline">Cash desk →</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingCF.map((f) => (
                <div key={f.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{f.patientName}</p>
                    <p className="text-xs text-slate-400">{f.doctorName} · {f.consultationType} · {f.consultedAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900 text-sm">₦{f.fee}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[f.status]}`}>{f.status}</span>
                  </div>
                </div>
              ))}
              {pendingCF.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No pending consultation fees.</p>
              )}
            </div>
          </Card>

          {/* Lab Billing */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Lab Billing</h3>
                <p className="text-xs text-slate-400 mt-0.5">Outstanding lab charges and lab revenue tracking.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {metrics.labPendingCount} pending
                </span>
                <Link href={`${INTERNAL_PREFIX}/accounts/cash-desk?department=lab`} className="text-sm font-semibold text-accent hover:underline">Open cash desk →</Link>
              </div>
            </div>
            {/* Lab Bills summary row */}
            <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="p-3 text-center">
                <p className={`text-lg font-bold ${metrics.labPendingCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>{metrics.labPendingCount}</p>
                <p className="text-[10px] text-slate-500">Lab Bills Pending</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">₦{metrics.labPaidToday}</p>
                <p className="text-[10px] text-slate-500">Lab Revenue Today</p>
              </div>
            </div>
          </Card>

          {/* Payroll & Supplier side-by-side summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900 text-sm">Payroll Batches</h3>
                <Link href={`${INTERNAL_PREFIX}/accounts/payroll`} className="text-xs font-semibold text-accent hover:underline">View →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {payrollBatches.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{b.period}</p>
                      <p className="text-xs text-slate-400">{b.totalStaff} staff</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">₦{b.totalAmount.toLocaleString()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
                {payrollBatches.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">No batches yet.</p>}
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900 text-sm">Supplier Payments</h3>
                <Link href={`${INTERNAL_PREFIX}/accounts/supplier-payments`} className="text-xs font-semibold text-accent hover:underline">View →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingSupplier.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{p.supplier}</p>
                      <p className="text-xs text-slate-400">{p.poId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">₦{p.amount.toLocaleString()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
                {pendingSupplier.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">No pending supplier payments.</p>}
              </div>
            </Card>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Cash Desk", href: `${INTERNAL_PREFIX}/accounts/cash-desk` },
                { label: "Patient Accounts", href: `${INTERNAL_PREFIX}/accounts/patients` },
                { label: "Invoices", href: `${INTERNAL_PREFIX}/accounts/invoices` },
                { label: "Inpatient Billing", href: `${INTERNAL_PREFIX}/accounts/inpatient-billing` },
                { label: "Transaction Ledger", href: `${INTERNAL_PREFIX}/accounts/ledger` },
                { label: "Supplier Payments", href: `${INTERNAL_PREFIX}/accounts/supplier-payments` },
                { label: "Payroll", href: `${INTERNAL_PREFIX}/accounts/payroll` },
                { label: "Staff Banking", href: `${INTERNAL_PREFIX}/accounts/staff-banking` },
                { label: "Kiosk Revenue", href: `${INTERNAL_PREFIX}/accounts/kiosk` },
                { label: "Financial Reports", href: `${INTERNAL_PREFIX}/accounts/reports` },
                { label: "Day Close", href: `${INTERNAL_PREFIX}/accounts/day-close` },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-3.5 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Kiosk Revenue Summary */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">Kiosk Revenue</h3>
              <Link href={`${INTERNAL_PREFIX}/accounts/kiosk`} className="text-xs font-semibold text-accent hover:underline">View →</Link>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Today (pending)</span>
                <span className="font-semibold text-slate-900">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">MTD Confirmed</span>
                <span className="font-bold text-emerald-700">₦{metrics.kioskRevenueMTD.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {recentKiosk.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                  <span className="text-slate-600">{k.date}</span>
                  <span className="font-semibold text-slate-800">₦{k.totalRevenue.toLocaleString()}</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS_STYLES[k.status]}`}>{k.status}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* P&L Summary — HOD + Admin only */}
          <Card className="p-5 border border-emerald-200 bg-linear-to-br from-white to-emerald-50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">P&amp;L Summary</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                HOD · Admin
              </span>
            </div>

            {/* Net P&L headline */}
            <div className={`mb-4 rounded-xl p-4 text-center ${netPL >= 0 ? "bg-emerald-100" : "bg-red-50"}`}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Net Position Today</p>
              <p className={`mt-1 text-2xl font-bold sm:text-3xl ${netPL >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {netPL >= 0 ? "+" : ""}₦{Math.abs(netPL).toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{netPL >= 0 ? "Surplus" : "Deficit"}</p>
            </div>

            {/* Revenue breakdown */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Revenue</p>
              {[
                { label: "Front Desk", value: metrics.frontDeskPaidToday },
                { label: "Consultations", value: consultationFees.filter((f) => f.status === "Paid").reduce((s, f) => s + f.fee, 0) },
                { label: "Invoices", value: invoiceRevenueToday },
                { label: "Pharmacy", value: pharmacyRevToday },
                { label: "Lab Tests", value: metrics.labPaidToday },
                { label: "Kiosk", value: metrics.kioskRevenueToday },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-slate-900">₦{r.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold">
                <span className="text-slate-700">Total Revenue</span>
                <span className="text-emerald-700">₦{totalRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* Expenses breakdown */}
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Expenses</p>
              {[
                { label: "Supplier Payments", value: supplierPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0) },
                { label: "Payroll Disbursed", value: payrollBatches.filter((b) => b.status === "Paid").reduce((s, b) => s + b.totalAmount, 0) },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-semibold text-red-600">₦{r.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold">
                <span className="text-slate-700">Total Expenses</span>
                <span className="text-red-600">₦{totalExpenses.toLocaleString()}</span>
              </div>
            </div>

            <Link href={`${INTERNAL_PREFIX}/accounts/reports`}
              className="mt-4 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
              Full P&amp;L Report →
            </Link>
          </Card>

          {/* Revenue Breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Revenue Sources</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: "Front Desk", value: metrics.frontDeskPaidToday, max: totalRevenue },
                { label: "Invoices", value: invoiceRevenueToday, max: totalRevenue },
                { label: "Pharmacy", value: pharmacyRevToday, max: totalRevenue },
                { label: "Consultations", value: consultationFees.filter((f) => f.status === "Paid").reduce((s, f) => s + f.fee, 0), max: totalRevenue },
                { label: "Lab Tests", value: metrics.labPaidToday, max: totalRevenue },
                { label: "Kiosk", value: metrics.kioskRevenueToday, max: totalRevenue },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600">{r.label}</span>
                    <span className="font-semibold text-slate-900">₦{r.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-accent"
                      style={{ width: r.max > 0 ? `${Math.round((r.value / r.max) * 100)}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
