"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { fetchInvoices, fetchPayments, type InvoiceRecord, type PaymentRecord } from "@/lib/supabase/db";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AdminAccountsMonitorPage() {
  const { metrics, frontDeskCharges, consultationFees, payrollBatches, supplierPayments, labCharges, nursingCharges } = useAccountsStore();
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
        console.error("[admin-accounts] invoice payment load failed:", error);
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
  const pendingBills = [
    ...frontDeskCharges.filter((c) => c.status === "Pending").map((c) => ({ name: c.patientName, type: "Front Desk", amount: c.amount, date: c.createdAt })),
    ...consultationFees.filter((c) => c.status === "Pending").map((c) => ({ name: c.patientName, type: "Consultation", amount: c.fee, date: c.consultedAt })),
    ...labCharges.filter((c) => c.status === "Pending").map((c) => ({ name: c.patientName, type: "Lab", amount: c.amount, date: c.completedAt })),
    ...nursingCharges.filter((c) => c.status === "Pending" || (c.status as string) === "Billed").map((c) => ({ name: c.patientName, type: "Nursing", amount: c.amount, date: c.performedAt })),
  ].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Accounts Monitor" description="Financial oversight — revenue, receivables, payroll, supplier payments, and department billing." />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Revenue Today", value: `₦${(metrics.revenueToday + invoiceRevenueToday).toLocaleString()}`, color: "text-emerald-700" },
          { label: "Pending Collections", value: `₦${(metrics.frontDeskPendingValue + metrics.consultationPendingValue + metrics.labPendingValue + metrics.nursingPendingValue + invoicePendingBalance).toLocaleString()}`, color: "text-amber-600" },
          { label: "Payroll Pending", value: `₦${metrics.payrollPendingValue.toLocaleString()}`, color: "text-sky-700" },
          { label: "Supplier Payable", value: `₦${metrics.supplierPendingValue.toLocaleString()}`, color: metrics.supplierPendingCount > 0 ? "text-red-600" : "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
            <p className={`shrink-0 text-base font-bold sm:text-lg ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0 md:hidden">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="font-bold text-slate-900">Pending Bills — All Departments</h3>
            </div>
            <div className="space-y-3 p-3">
              {pendingBills.map((b, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{b.name}</p>
                      <p className="text-xs text-slate-400">{b.type} charge</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.type === "Lab" ? "bg-sky-50 text-sky-700" : b.type === "Nursing" ? "bg-violet-50 text-violet-700" : b.type === "Consultation" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      ₦{b.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <MobileMeta label="Department" value={b.type} />
                    <MobileMeta label="Date" value={b.date} />
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="font-bold text-slate-900">Pending Bills — All Departments</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingBills.map((b, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${b.type === "Lab" ? "bg-sky-400" : b.type === "Nursing" ? "bg-violet-400" : b.type === "Consultation" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.type} charge · {b.date}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-900">₦{b.amount}</span>
                </div>
              ))}
              {pendingBills.length === 0 && <div className="px-5 py-6 text-center text-sm text-slate-400">No pending bills.</div>}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <h3 className="font-bold text-slate-900 text-sm">Payroll Batches</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {payrollBatches.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div><p className="font-medium text-slate-800">{b.period}</p><p className="text-slate-400">{b.totalStaff} staff</p></div>
                    <div className="text-right">
                      <p className="font-bold">₦{b.totalAmount.toLocaleString()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.status === "Paid" ? "bg-emerald-50 text-emerald-700" : b.status === "Submitted" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
                {payrollBatches.length === 0 && <p className="px-4 py-4 text-xs text-slate-400 text-center">None yet.</p>}
              </div>
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <h3 className="font-bold text-slate-900 text-sm">Supplier Payments</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {supplierPayments.filter((p) => p.status === "Pending").slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                    <div><p className="font-medium text-slate-800">{p.supplier}</p><p className="text-slate-400">{p.poId}</p></div>
                    <div className="text-right">
                      <p className="font-bold">₦{p.amount.toLocaleString()}</p>
                      <span className="text-amber-600 font-semibold">Pending</span>
                    </div>
                  </div>
                ))}
                {supplierPayments.filter((p) => p.status === "Pending").length === 0 && <p className="px-4 py-4 text-xs text-slate-400 text-center">None pending.</p>}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 mb-3">Revenue Sources Today</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Front Desk", value: metrics.frontDeskPaidToday, color: "bg-amber-400" },
                { label: "Consultations", value: consultationFees.filter((f) => f.status === "Paid").reduce((s, f) => s + f.fee, 0), color: "bg-emerald-400" },
                { label: "Invoices", value: invoiceRevenueToday, color: "bg-violet-400" },
                { label: "Lab Tests", value: metrics.labPaidToday, color: "bg-sky-400" },
                { label: "Nursing", value: metrics.nursingPaidToday, color: "bg-violet-400" },
                { label: "Kiosk", value: metrics.kioskRevenueToday, color: "bg-pink-400" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${r.color}`} />
                  <span className="flex-1 text-xs text-slate-600">{r.label}</span>
                  <span className="text-xs font-bold text-slate-800">₦{r.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
