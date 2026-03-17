"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";

export default function AdminAccountsMonitorPage() {
  const { metrics, frontDeskCharges, consultationFees, payrollBatches, supplierPayments, labCharges, nursingCharges } = useAccountsStore();

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
        <Link href={`${INTERNAL_PREFIX}/accounts`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          Open Accounts →
        </Link>
      </div>

      <div className="flex gap-3">
        {[
          { label: "Revenue Today", value: `₦${metrics.revenueToday.toLocaleString()}`, color: "text-emerald-700" },
          { label: "Pending Collections", value: metrics.frontDeskPendingCount + metrics.consultationPendingCount + metrics.labPendingCount + metrics.nursingPendingCount, color: "text-amber-600" },
          { label: "Payroll Pending", value: `₦${metrics.payrollPendingValue.toLocaleString()}`, color: "text-sky-700" },
          { label: "Supplier Payable", value: `₦${metrics.supplierPendingValue.toLocaleString()}`, color: metrics.supplierPendingCount > 0 ? "text-red-600" : "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-lg font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
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
              <div className="border-b border-slate-100 px-4 py-3">
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
              <div className="border-b border-slate-100 px-4 py-3">
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
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Revenue Sources Today</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Front Desk", value: metrics.frontDeskPaidToday, color: "bg-amber-400" },
                { label: "Consultations", value: consultationFees.filter((f) => f.status === "Paid").reduce((s, f) => s + f.fee, 0), color: "bg-emerald-400" },
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
          <Link href={`${INTERNAL_PREFIX}/accounts/payroll`}
            className="block rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 text-center transition">
            Approve Payroll →
          </Link>
          <Link href={`${INTERNAL_PREFIX}/accounts/supplier-payments`}
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center transition">
            Supplier Payments →
          </Link>
        </div>
      </div>
    </div>
  );
}
