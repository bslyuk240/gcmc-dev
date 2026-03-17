"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useAdminStore } from "@/lib/hooks/use-admin-store";

const kpis = [
  { label: "TOTAL REVENUE TODAY", value: "₦ 45,280", change: "+12.5% vs yesterday", up: true },
  { label: "TOTAL PATIENTS", value: "1,284", change: "-2.1% from last week", up: false },
  { label: "STAFF ATTENDANCE", value: "94%", change: "On target (+0.5%)", up: true },
  { label: "OPEN IT TICKETS", value: "12", change: "! 3 Urgent Priority", urgent: true },
];

const visitTrendData = [32, 28, 45, 38, 52, 48, 55];

const deptStatus = [
  { name: "Clinical Care", status: "HIGH LOAD", statusClass: "text-red-600", barPct: 94, barClass: "bg-orange-500", detail: "Active Staff 84", sub: "Avg Recovery 3.2d" },
  { name: "Accounts & Billing", status: "BALANCED", statusClass: "text-emerald-600", barPct: 76, barClass: "bg-emerald-500", detail: "Claims Paid ₦210k", sub: "Outstanding ₦45k" },
  { name: "Nursing", status: "OPERATIONAL", statusClass: "text-emerald-600", barPct: 81, barClass: "bg-blue-400", detail: "Ward Coverage 96%", sub: "3 Shift Handovers" },
];

export default function AdminDashboardPage() {
  const { metrics, prescriptions, restockRequests } = usePharmacyStore();
  const { metrics: accMetrics, payrollBatches, supplierPayments } = useAccountsStore();
  const { tests: labTests, metrics: labMetrics } = useLabStore();
  const { allPatients: nursePatients, metrics: nurseMetrics, procedures: nurseProcedures } = useNursesStore();
  const { metrics: adminMetrics, approvals, itTickets, alerts } = useAdminStore();

  // Derive pharmacy KPIs from live data
  const criticalDrugs = restockRequests.filter((r) => r.status === "Pending" && r.urgency === "Critical");
  const urgentDrugs = restockRequests.filter((r) => r.status === "Pending");
  const dispensedToday = prescriptions.filter((p) => p.status === "Dispensed");
  const pendingRx = prescriptions.filter((p) => p.status === "Pending" || p.status === "Processing");

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Admin Dashboard</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Hospital-wide oversight — operations, finances, and staffing</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{k.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${k.urgent ? "text-amber-600" : k.up ? "text-emerald-600" : "text-red-600"}`}>
              {k.up && !k.urgent && <span aria-hidden>↑</span>}
              {!k.up && !k.urgent && <span aria-hidden>↓</span>}
              {k.urgent && <span aria-hidden>!</span>}
              {k.change}
            </p>
          </Card>
        ))}
      </div>

      {/* 9-Department Status Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">All Departments — Live Status</h2>
          <Link href={`${INTERNAL_PREFIX}/admin/department-monitoring`} className="text-xs font-semibold text-blue-600 hover:underline">Full Overview →</Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {[
            { label: "Front Desk", href: "/admin/frontdesk", dot: "bg-emerald-500", status: "OK" },
            { label: "Doctors", href: "/admin/doctors", dot: "bg-emerald-500", status: "OK" },
            { label: "Nurses", href: "/admin/nurses", dot: nurseMetrics.criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500", status: nurseMetrics.criticalCount > 0 ? "Critical" : "OK" },
            { label: "Pharmacy", href: "/admin/pharmacy", dot: metrics.pendingPrescriptions > 5 ? "bg-amber-500 animate-pulse" : "bg-emerald-500", status: metrics.pendingPrescriptions > 5 ? "Busy" : "OK" },
            { label: "Lab", href: "/admin/lab", dot: labMetrics.urgentTests > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500", status: labMetrics.urgentTests > 0 ? "Urgent" : "OK" },
            { label: "Accounts", href: "/admin/accounts", dot: "bg-emerald-500", status: "OK" },
            { label: "Store", href: "/admin/store", dot: adminMetrics.criticalStock > 0 ? "bg-red-500 animate-pulse" : adminMetrics.stockAlerts > 0 ? "bg-amber-500" : "bg-emerald-500", status: adminMetrics.criticalStock > 0 ? "Critical" : "OK" },
            { label: "HR", href: "/admin/hr", dot: adminMetrics.pendingLeave > 0 ? "bg-sky-500" : "bg-emerald-500", status: "OK" },
            { label: "IT", href: "/admin/it", dot: adminMetrics.criticalITTickets > 0 ? "bg-red-500 animate-pulse" : adminMetrics.openITTickets > 0 ? "bg-amber-500" : "bg-emerald-500", status: adminMetrics.criticalITTickets > 0 ? "Critical" : "OK" },
          ].map((d) => (
            <Link key={d.label} href={`${INTERNAL_PREFIX}${d.href}`}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 hover:border-slate-300 transition">
              <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} />
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{d.label}</span>
              <span className={`text-[10px] ${d.status === "OK" ? "text-emerald-600" : d.status === "Critical" ? "text-red-600 font-bold" : "text-amber-600"}`}>{d.status}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Approvals & Alerts strip */}
      {(adminMetrics.pendingApprovals > 0 || alerts.filter((a) => !a.resolved && a.level === "Critical").length > 0) && (
        <div className="flex flex-wrap gap-3">
          {adminMetrics.pendingApprovals > 0 && (
            <Link href={`${INTERNAL_PREFIX}/admin/approvals`}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 hover:bg-amber-100 transition">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-800">{adminMetrics.pendingApprovals} approval{adminMetrics.pendingApprovals > 1 ? "s" : ""} pending review</span>
            </Link>
          )}
          {adminMetrics.escalatedApprovals > 0 && (
            <Link href={`${INTERNAL_PREFIX}/admin/approvals`}
              className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 hover:bg-orange-100 transition">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-800">{adminMetrics.escalatedApprovals} escalated — requires urgent attention</span>
            </Link>
          )}
          {alerts.filter((a) => !a.resolved && a.level === "Critical").map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-800">{a.department}: {a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pharmacy Live Monitor */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pharmacy Operations Monitor</h2>
            <p className="text-xs text-slate-500">Live data from the pharmacy department</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`} className="text-sm font-semibold text-blue-600 hover:underline">
            Open Pharmacy →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "PENDING PRESCRIPTIONS",
              value: metrics.pendingPrescriptions,
              sub: `${metrics.urgentPrescriptions} urgent`,
              color: metrics.urgentPrescriptions > 0 ? "text-red-600" : "text-amber-600",
              bg: metrics.urgentPrescriptions > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200",
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            },
            {
              label: "DISPENSED TODAY",
              value: dispensedToday.length,
              sub: `₦${dispensedToday.reduce((s, p) => s + (p.totalCost ?? 0), 0).toFixed(0)} billed`,
              color: "text-emerald-700",
              bg: "bg-emerald-50 border-emerald-200",
              icon: "M5 13l4 4L19 7",
            },
            {
              label: "UNPAID BILLS",
              value: metrics.pendingBills,
              sub: `₦${metrics.pendingBillValue.toFixed(0)} outstanding`,
              color: metrics.pendingBills > 0 ? "text-violet-700" : "text-slate-600",
              bg: "bg-violet-50 border-violet-200",
              icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z",
            },
            {
              label: "STOCK ALERTS",
              value: urgentDrugs.length,
              sub: criticalDrugs.length > 0 ? `${criticalDrugs.length} critical!` : "Restock requests pending",
              color: criticalDrugs.length > 0 ? "text-red-700" : urgentDrugs.length > 0 ? "text-orange-600" : "text-emerald-600",
              bg: criticalDrugs.length > 0 ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200",
              icon: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
            },
          ].map((stat) => (
            <Card key={stat.label} className={`p-4 border ${stat.bg}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{stat.label}</p>
                <svg className={`h-4 w-4 shrink-0 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                </svg>
              </div>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
            </Card>
          ))}
        </div>

        {/* Pharmacy details row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Recent dispensed */}
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Dispensed Prescriptions</h3>
              <Link href={`${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {dispensedToday.slice(0, 4).map((rx) => (
                <div key={rx.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800">{rx.patientName}</p>
                    <p className="text-xs text-slate-500">{rx.drugs.map((d) => d.name).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-700">₦{(rx.totalCost ?? 0).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">{rx.dispensedAt}</p>
                  </div>
                </div>
              ))}
              {dispensedToday.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">No dispensed prescriptions yet today.</p>
              )}
            </div>
          </Card>

          {/* Pending prescriptions + stock alerts */}
          <div className="space-y-3">
            {pendingRx.length > 0 && (
              <Card className="p-4 border border-amber-200 bg-amber-50">
                <h3 className="text-sm font-bold text-amber-800 mb-2">Pending Prescriptions ({pendingRx.length})</h3>
                {pendingRx.slice(0, 3).map((rx) => (
                  <div key={rx.id} className="flex justify-between text-xs py-1 border-b border-amber-100 last:border-0">
                    <span className="font-medium text-slate-800">{rx.patientName}</span>
                    <span className={rx.urgency === "Urgent" ? "font-bold text-red-600" : "text-slate-500"}>{rx.urgency}</span>
                  </div>
                ))}
              </Card>
            )}
            {urgentDrugs.length > 0 && (
              <Card className="p-4 border border-orange-200 bg-orange-50">
                <h3 className="text-sm font-bold text-orange-800 mb-2">Stock Alerts — Restock Needed</h3>
                {urgentDrugs.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex justify-between text-xs py-1 border-b border-orange-100 last:border-0">
                    <span className="font-medium text-slate-800">{r.drug}</span>
                    <span className={r.urgency === "Critical" ? "font-bold text-red-600" : "text-orange-700"}>{r.currentStock} left · {r.urgency}</span>
                  </div>
                ))}
                <Link href={`${INTERNAL_PREFIX}/store/requests`} className="mt-2 block text-xs font-semibold text-orange-700 hover:underline">
                  Go to Store Requests →
                </Link>
              </Card>
            )}
            {metrics.nurseReadyRequests > 0 && (
              <Card className="p-4 border border-violet-200 bg-violet-50">
                <h3 className="text-sm font-bold text-violet-800">Nurse Med Requests Ready</h3>
                <p className="text-xs text-slate-600 mt-1">{metrics.nurseReadyRequests} medication(s) ready for collection by Nursing.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Accounts Financial Monitor */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Accounts Financial Monitor</h2>
            <p className="text-xs text-slate-500">Live data from all financial flows — revenue, payroll, payables</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/accounts`} className="text-sm font-semibold text-blue-600 hover:underline">
            Open Accounts →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "REVENUE TODAY",
              value: `₦${accMetrics.revenueToday.toLocaleString()}`,
              sub: "Front Desk + Consult + Kiosk",
              color: "text-emerald-700",
              bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "PENDING COLLECTIONS",
              value: `₦${(accMetrics.frontDeskPendingValue + accMetrics.consultationPendingValue).toLocaleString()}`,
              sub: `${accMetrics.frontDeskPendingCount + accMetrics.consultationPendingCount} unpaid charges`,
              color: accMetrics.frontDeskPendingCount + accMetrics.consultationPendingCount > 0 ? "text-amber-700" : "text-slate-600",
              bg: "bg-amber-50 border-amber-200",
            },
            {
              label: "PAYROLL PENDING",
              value: `₦${accMetrics.payrollPendingValue.toLocaleString()}`,
              sub: `${accMetrics.payrollPendingCount} batch(es) awaiting approval`,
              color: accMetrics.payrollPendingCount > 0 ? "text-sky-700" : "text-slate-600",
              bg: "bg-sky-50 border-sky-200",
            },
            {
              label: "SUPPLIER PAYABLE",
              value: `₦${accMetrics.supplierPendingValue.toLocaleString()}`,
              sub: `${accMetrics.supplierPendingCount} outstanding invoices`,
              color: accMetrics.supplierPendingCount > 0 ? "text-red-600" : "text-slate-600",
              bg: accMetrics.supplierPendingCount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",
            },
          ].map((s) => (
            <Card key={s.label} className={`p-4 border ${s.bg}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Recent payroll */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Payroll Batches</h3>
              <Link href={`${INTERNAL_PREFIX}/accounts/payroll`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {payrollBatches.slice(0, 4).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800">{b.period}</p>
                    <p className="text-xs text-slate-500">{b.totalStaff} staff</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">₦{b.totalAmount.toLocaleString()}</p>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      b.status === "Paid" ? "bg-emerald-50 text-emerald-700"
                      : b.status === "Submitted" ? "bg-sky-50 text-sky-700"
                      : b.status === "Approved" ? "bg-violet-50 text-violet-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{b.status}</span>
                  </div>
                </div>
              ))}
              {payrollBatches.length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No payroll batches yet.</p>
              )}
            </div>
          </Card>

          {/* Supplier payments */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Supplier Payments</h3>
              <Link href={`${INTERNAL_PREFIX}/accounts/supplier-payments`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {supplierPayments.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800">{p.supplier}</p>
                    <p className="text-xs text-slate-500">{p.poId} · Due {p.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">₦{p.amount.toLocaleString()}</p>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      p.status === "Paid" ? "bg-emerald-50 text-emerald-700"
                      : p.status === "Pending" ? "bg-amber-50 text-amber-700"
                      : p.status === "Approved" ? "bg-violet-50 text-violet-700"
                      : "bg-red-50 text-red-700"
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
              {supplierPayments.length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No supplier payments yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Lab Monitor */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lab Operations Monitor</h2>
            <p className="text-xs text-slate-500">Live data from the Laboratory — test pipeline, results and turnaround</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/lab`} className="text-sm font-semibold text-blue-600 hover:underline">
            Open Lab →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "PENDING TESTS",
              value: labMetrics.pendingTests,
              sub: `${labMetrics.urgentTests} urgent/STAT`,
              color: labMetrics.urgentTests > 0 ? "text-red-700" : "text-amber-600",
              bg: labMetrics.urgentTests > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200",
            },
            {
              label: "IN PROGRESS",
              value: labMetrics.inProgressTests,
              sub: `${labMetrics.sampleCollectedTests} samples collected`,
              color: "text-violet-700",
              bg: "bg-violet-50 border-violet-200",
            },
            {
              label: "COMPLETED TODAY",
              value: labMetrics.completedTests,
              sub: `₦${labMetrics.revenueToday} billed`,
              color: "text-emerald-700",
              bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "AVG TURNAROUND",
              value: labMetrics.avgTurnaround,
              sub: "Target: under 2 hours",
              color: "text-slate-900",
              bg: "bg-slate-50 border-slate-200",
            },
          ].map((s) => (
            <Card key={s.label} className={`p-4 border ${s.bg}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Urgent/pending tests */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Active Test Pipeline</h3>
              <Link href={`${INTERNAL_PREFIX}/lab/test-requests`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {labTests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800 text-xs">{t.patientName}</p>
                    <p className="text-[11px] text-slate-500">{t.testName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      t.priority === "STAT" ? "bg-red-100 text-red-700"
                      : t.priority === "Urgent" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{t.priority}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.status}</p>
                  </div>
                </div>
              ))}
              {labTests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No active tests.</p>
              )}
            </div>
          </Card>

          {/* Recent results */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Results</h3>
              <Link href={`${INTERNAL_PREFIX}/lab/results`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {labTests.filter((t) => t.status === "Completed").slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800 text-xs">{t.patientName}</p>
                    <p className="text-[11px] text-slate-500">{t.testName}</p>
                  </div>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                    t.interpretation === "Critical" ? "bg-red-50 text-red-700"
                    : t.interpretation === "Abnormal" ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                  }`}>{t.interpretation ?? "Normal"}</span>
                </div>
              ))}
              {labTests.filter((t) => t.status === "Completed").length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No completed tests yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Nurses Bay Monitor */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Nurses Bay Monitor</h2>
            <p className="text-xs text-slate-500">Live nursing activity — Outpatient · Ward · Emergency · ICU</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/nurses`} className="text-sm font-semibold text-blue-600 hover:underline">
            Open Nurses Bay →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "WARD PATIENTS",
              value: nurseMetrics.wardCount,
              sub: `${nurseMetrics.watchCount} on watch`,
              color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "EMERGENCY ACTIVE",
              value: nurseMetrics.emergencyCount,
              sub: `${nursePatients.filter((p) => p.unit === "Emergency" && p.priority === "Critical").length} critical`,
              color: nurseMetrics.emergencyCount > 0 ? "text-amber-700" : "text-slate-600",
              bg: nurseMetrics.emergencyCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
            },
            {
              label: "ICU CRITICAL",
              value: nurseMetrics.icuCount,
              sub: `${nurseMetrics.criticalCount} critical across all units`,
              color: nurseMetrics.icuCount > 0 ? "text-red-700" : "text-slate-600",
              bg: nurseMetrics.icuCount > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200",
            },
            {
              label: "PROCEDURE BILLS",
              value: nurseMetrics.pendingProcedureBills,
              sub: `₦${nurseMetrics.procedureBillValue} pending to Accounts`,
              color: nurseMetrics.pendingProcedureBills > 0 ? "text-violet-700" : "text-slate-600",
              bg: "bg-violet-50 border-violet-200",
            },
          ].map((s) => (
            <Card key={s.label} className={`p-4 border ${s.bg}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{s.label}</p>
              <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.sub}</p>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Critical patients */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Critical &amp; High Priority Patients</h3>
              <Link href={`${INTERNAL_PREFIX}/nurses`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {nursePatients.filter((p) => (p.priority === "Critical" || p.priority === "High") && p.status === "Active").slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800 text-xs">{p.patientName}</p>
                    <p className="text-[11px] text-slate-500">{p.unit} · {p.bed} · {p.doctorInCharge}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      p.priority === "Critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>{p.priority}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{p.assignedNurse}</p>
                  </div>
                </div>
              ))}
              {nursePatients.filter((p) => (p.priority === "Critical" || p.priority === "High") && p.status === "Active").length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No critical or high-priority patients.</p>
              )}
            </div>
          </Card>

          {/* Pending procedure charges */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Pending Nursing Charges</h3>
              <Link href={`${INTERNAL_PREFIX}/nurses/procedure-charges`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {nurseProcedures.filter((p) => p.billStatus === "Pending").slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-medium text-slate-800 text-xs">{p.patientName}</p>
                    <p className="text-[11px] text-slate-500">{p.procedureType} · {p.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-700">₦{p.amount}</p>
                    <span className="text-[10px] text-amber-600">Pending</span>
                  </div>
                </div>
              ))}
              {nurseProcedures.filter((p) => p.billStatus === "Pending").length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">No pending nursing charges.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* New Department Monitors — FrontDesk, Doctors, Store, HR, IT */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Additional Department Monitors</h2>
            <p className="text-xs text-slate-500">Front Desk, Doctors, Store, HR, and IT — live status and key metrics</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/admin/department-monitoring`} className="text-sm font-semibold text-blue-600 hover:underline">All Departments →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* IT Monitor */}
          <Card className={`p-4 border-2 ${adminMetrics.criticalITTickets > 0 ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">IT Monitor</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/it`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.openITTickets > 0 ? "text-amber-600" : "text-slate-500"}`}>{adminMetrics.openITTickets}</p>
                <p className="text-[10px] text-slate-500">Open Tickets</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.criticalITTickets > 0 ? "text-red-700" : "text-slate-500"}`}>{adminMetrics.criticalITTickets}</p>
                <p className="text-[10px] text-slate-500">Critical/Urgent</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {itTickets.filter((t) => t.status === "Open" || t.status === "In Progress").slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs rounded bg-white/70 px-2 py-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.priority === "Critical" ? "bg-red-500" : t.priority === "Urgent" ? "bg-orange-500" : "bg-amber-400"}`} />
                  <span className="flex-1 truncate text-slate-700">{t.title}</span>
                  <span className="text-slate-400 shrink-0">{t.department}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* HR Monitor */}
          <Card className="p-4 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">HR Monitor</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/hr`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className="text-xl font-bold text-emerald-700">{adminMetrics.totalStaff}</p>
                <p className="text-[10px] text-slate-500">Active Staff</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.pendingLeave > 0 ? "text-violet-700" : "text-slate-500"}`}>{adminMetrics.pendingLeave}</p>
                <p className="text-[10px] text-slate-500">Leave Pending</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">{adminMetrics.staffOnLeave} staff currently on leave across all departments.</p>
          </Card>

          {/* Store Monitor */}
          <Card className={`p-4 border-2 ${adminMetrics.criticalStock > 0 ? "border-red-200 bg-red-50/30" : adminMetrics.stockAlerts > 0 ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Store Monitor</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/store`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.criticalStock > 0 ? "text-red-700" : "text-slate-500"}`}>{adminMetrics.criticalStock}</p>
                <p className="text-[10px] text-slate-500">Critical/OOS</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.pendingPOs > 0 ? "text-violet-700" : "text-slate-500"}`}>{adminMetrics.pendingPOs}</p>
                <p className="text-[10px] text-slate-500">POs Pending</p>
              </div>
            </div>
            {adminMetrics.pendingPOs > 0 && (
              <Link href={`${INTERNAL_PREFIX}/admin/store`} className="block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 text-center hover:bg-amber-100">
                ₦{adminMetrics.pendingPOValue.toLocaleString()} in POs awaiting approval
              </Link>
            )}
          </Card>

          {/* Front Desk Monitor */}
          <Card className="p-4 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Front Desk Monitor</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/frontdesk`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className="text-xl font-bold text-violet-700">3</p>
                <p className="text-[10px] text-slate-500">Active Visits</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className="text-xl font-bold text-emerald-700">6</p>
                <p className="text-[10px] text-slate-500">Completed</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">9 patients processed today · Peak at 09:00.</p>
          </Card>

          {/* Doctors Monitor */}
          <Card className="p-4 border-2 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Doctors Monitor</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/doctors`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className="text-xl font-bold text-violet-700">2</p>
                <p className="text-[10px] text-slate-500">In Consult</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className="text-xl font-bold text-emerald-700">4</p>
                <p className="text-[10px] text-slate-500">Completed</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">3 prescriptions sent to pharmacy today.</p>
          </Card>

          {/* Approvals Spotlight */}
          <Card className={`p-4 border-2 ${adminMetrics.escalatedApprovals > 0 ? "border-orange-200 bg-orange-50/20" : adminMetrics.pendingApprovals > 0 ? "border-amber-200 bg-amber-50/20" : "border-slate-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Approvals Queue</h3>
              <Link href={`${INTERNAL_PREFIX}/admin/approvals`} className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.pendingApprovals > 0 ? "text-amber-600" : "text-slate-500"}`}>{adminMetrics.pendingApprovals}</p>
                <p className="text-[10px] text-slate-500">Pending</p>
              </div>
              <div className="flex-1 rounded-lg bg-white px-3 py-2 text-center border border-slate-100">
                <p className={`text-xl font-bold ${adminMetrics.escalatedApprovals > 0 ? "text-orange-700" : "text-slate-500"}`}>{adminMetrics.escalatedApprovals}</p>
                <p className="text-[10px] text-slate-500">Escalated</p>
              </div>
            </div>
            <div className="space-y-1">
              {approvals.filter((a) => a.status === "Pending" || a.status === "Escalated").slice(0, 2).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${a.status === "Escalated" ? "bg-orange-500" : "bg-amber-400"}`} />
                  <span className="truncate text-slate-700">{a.title}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Patient Visits Trend</h3>
              <p className="text-xs text-slate-500">Daily admissions and outpatient flow</p>
            </div>
            <div className="flex gap-1">
              <button type="button" className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">7D</button>
              <button type="button" className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">30D</button>
            </div>
          </div>
          <div className="mt-6 h-48">
            <svg viewBox="0 0 340 120" className="h-full w-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={visitTrendData.map((y, i) => {
                  const x = (i / (visitTrendData.length - 1)) * 320;
                  const yNorm = 100 - ((y - 25) / 35) * 80;
                  return `${x},${Math.max(20, Math.min(100, yNorm))}`;
                }).join(" ")}
              />
            </svg>
          </div>
          <div className="flex justify-between text-[10px] font-medium text-slate-400">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Revenue by Dept</h3>
          <p className="text-xs text-slate-500">Monthly distribution</p>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#2563eb" strokeWidth="4" strokeDasharray={`${0.42 * 100.5} 100.5`} />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#93c5fd" strokeWidth="4" strokeDasharray={`${0.28 * 100.5} 100.5`} strokeDashoffset={-0.42 * 100.5} />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeDasharray={`${0.3 * 100.5} 100.5`} strokeDashoffset={-(0.42 + 0.28) * 100.5} />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">TOTAL</p>
              <p className="text-2xl font-bold text-slate-900">₦1.2M</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Surgery 42%</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-300" /> Pharmacy 28%</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> Other 30%</span>
          </div>
        </Card>
      </div>

      {/* Departmental Status + Audit Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Departmental Status</h2>
            <Link href={`${INTERNAL_PREFIX}/admin/department-monitoring`} className="text-sm font-semibold text-blue-600 hover:underline">
              View Detailed Metrics →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Pharmacy live status card */}
            <Card className="p-4 border border-blue-200 bg-blue-50/30">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${metrics.pendingPrescriptions > 5 ? "text-amber-600" : "text-emerald-600"}`}>
                {metrics.pendingPrescriptions > 5 ? "BUSY" : "OPERATIONAL"}
              </p>
              <p className="mt-1 font-bold text-slate-900">Pharmacy</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, 60 + metrics.dispensedToday * 5)}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">Dispensed: {metrics.dispensedToday} · Pending: {metrics.pendingPrescriptions}</p>
              <p className="text-xs text-slate-500">Bills pending: {metrics.pendingBills}</p>
            </Card>
            {deptStatus.map((d) => (
              <Card key={d.name} className="p-4">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${d.statusClass}`}>{d.status}</p>
                <p className="mt-1 font-bold text-slate-900">{d.name}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${d.barClass}`} style={{ width: `${d.barPct}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-600">{d.detail}</p>
                <p className="text-xs text-slate-500">{d.sub}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recent Audit Logs</h3>
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 4.354a4 4 0 11 4 4M15 21H3v-1a6 6 0 016-6h0M21 21v-1a6 6 0 00-6-6" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">Staff shift updated</p>
              <p className="text-xs text-slate-500">14:22 PM</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">Prescription dispensed</p>
              <p className="text-xs text-slate-500">Pharmacy · just now</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
