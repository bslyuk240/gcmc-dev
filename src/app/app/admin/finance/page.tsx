"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminPageHeader, AdminKpiCard, AdminStatusBadge, AdminCardTitle } from "@/components/admin/admin-ui";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { fetchInvoices, fetchPayments, type InvoiceRecord, type PaymentRecord } from "@/lib/supabase/db";

export default function AdminFinancePage() {
  const { metrics, frontDeskCharges, consultationFees, payrollBatches, supplierPayments, labCharges, nursingCharges } =
    useAccountsStore();
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRecord[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [rows, payments] = await Promise.all([fetchInvoices(), fetchPayments()]);
        if (!alive) return;
        setInvoiceRows(rows);
        setInvoicePayments(payments);
      } catch (e) {
        console.error("[admin-finance]", e);
      }
    };
    void load();
    const refresh = () => { void load(); };
    window.addEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh);
    return () => { alive = false; window.removeEventListener(ACCOUNTS_PAYMENT_UPDATED_EVENT, refresh); };
  }, []);

  const todayIso = new Date().toISOString().slice(0, 10);
  const invoiceRevenueToday = useMemo(
    () => invoicePayments.filter((p) => p.paidAt.startsWith(todayIso)).reduce((s, p) => s + p.amount, 0),
    [invoicePayments, todayIso],
  );
  const invoicePending = useMemo(
    () => invoiceRows.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((s, i) => s + Math.max(0, i.amountDue - i.amountPaid), 0),
    [invoiceRows],
  );
  const revenueToday = metrics.revenueToday + invoiceRevenueToday;
  const pendingTotal =
    metrics.frontDeskPendingValue +
    metrics.consultationPendingValue +
    metrics.labPendingValue +
    metrics.nursingPendingValue +
    invoicePending;
  const expensesToday = supplierPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);

  const recentTx = [
    ...frontDeskCharges.slice(0, 3).map((c) => ({ id: c.id, patient: c.patientName, dept: "Front Desk", amount: c.amount, status: c.status })),
    ...consultationFees.slice(0, 2).map((c) => ({ id: c.id, patient: c.patientName, dept: "Doctors", amount: c.fee, status: c.status })),
    ...labCharges.slice(0, 2).map((c) => ({ id: c.id, patient: c.patientName, dept: "Lab", amount: c.amount, status: c.status })),
    ...nursingCharges.slice(0, 2).map((c) => ({ id: c.id, patient: c.patientName, dept: "Nurses", amount: c.amount, status: c.status })),
  ].slice(0, 8);

  const deptRevenue = [
    { dept: "Front Desk", amount: frontDeskCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0) },
    { dept: "Doctors", amount: consultationFees.filter((c) => c.status === "Paid").reduce((s, c) => s + c.fee, 0) },
    { dept: "Lab", amount: labCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0) },
    { dept: "Nurses", amount: nursingCharges.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0) },
  ].sort((a, b) => b.amount - a.amount);

  const maxDept = Math.max(...deptRevenue.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Finance Overview"
        subtitle="Revenue, expenses, outstanding bills, and payment activity."
        action={
          <Link href="/app/admin/reports" className="text-sm font-semibold text-indigo-600 hover:underline">
            Full reports →
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Total Revenue (Today)" value={`₦${revenueToday.toLocaleString()}`} trend="+22.6%" trendUp />
        <AdminKpiCard label="Total Expense (Today)" value={`₦${expensesToday.toLocaleString()}`} />
        <AdminKpiCard label="Net (Today)" value={`₦${(revenueToday - expensesToday).toLocaleString()}`} trendUp={revenueToday >= expensesToday} />
        <AdminKpiCard label="Outstanding Amount" value={`₦${pendingTotal.toLocaleString()}`} sub={`Payroll pending: ₦${metrics.payrollPendingValue.toLocaleString()}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <AdminCardTitle title="Revenue by Department" />
          <div className="space-y-3 p-5">
            {deptRevenue.map((d) => (
              <div key={d.dept}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{d.dept}</span>
                  <span className="font-semibold text-slate-900">₦{d.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-100">
                  <div className="h-2 bg-indigo-500" style={{ width: `${(d.amount / maxDept) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <AdminCardTitle title="Payroll & Supplier" />
          <div className="divide-y divide-slate-100 p-5">
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-600">Payroll batches pending</span>
              <span className="font-semibold text-slate-900">{metrics.payrollPendingCount}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-600">Payroll value pending</span>
              <span className="font-semibold text-sky-700">₦{metrics.payrollPendingValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-slate-600">Supplier payments (paid)</span>
              <span className="font-semibold text-emerald-700">
                ₦{supplierPayments.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <AdminCardTitle title="Recent Transactions" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTx.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{tx.patient}</td>
                  <td className="px-5 py-3 text-slate-600">{tx.dept}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">₦{tx.amount.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <AdminStatusBadge status={tx.status === "Paid" ? "Good" : "Warning"} />
                  </td>
                </tr>
              ))}
              {recentTx.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">No recent transactions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
