"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminKpiCard, AdminStatusBadge, AdminCardTitle, AdminBtnOutline } from "@/components/admin/admin-ui";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { useTenantBranding } from "@/modules/tenant/tenant-context";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function AdminDashboardPage() {
  const branding = useTenantBranding();
  const { metrics: rxM } = usePharmacyStore();
  const { metrics: accM } = useAccountsStore();
  const { metrics: labM } = useLabStore();
  const { metrics: nurseM } = useNursesStore();
  const { metrics: adminM, alerts, hrStaff } = useAdminStore();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const departments = [
    { name: "Front Desk", activity: `${nurseM.outpatientCount} outpatients`, pending: 0, status: "Good" as const },
    { name: "Doctors", activity: `${rxM.pendingPrescriptions} pending Rx`, pending: rxM.pendingPrescriptions, status: "Good" as const },
    { name: "Nurses", activity: `${nurseM.totalActive} active`, pending: nurseM.criticalCount, status: nurseM.criticalCount > 0 ? "Critical" as const : "Good" as const },
    { name: "Pharmacy", activity: `${rxM.dispensedToday} dispensed`, pending: rxM.pendingPrescriptions, status: rxM.pendingPrescriptions > 5 ? "Warning" as const : "Good" as const },
    { name: "Lab", activity: `${labM.urgentTests} urgent`, pending: labM.urgentTests, status: labM.urgentTests > 0 ? "Warning" as const : "Good" as const },
    { name: "Accounts", activity: `₦${accM.revenueToday.toLocaleString()}`, pending: accM.payrollPendingCount, status: "Good" as const },
    { name: "Store", activity: `${adminM.stockAlerts} alerts`, pending: adminM.pendingPOs, status: adminM.criticalStock > 0 ? "Critical" as const : "Good" as const },
    { name: "HR", activity: `${adminM.pendingLeave} leave`, pending: adminM.pendingLeave, status: adminM.pendingLeave > 0 ? "Warning" as const : "Good" as const },
    { name: "IT", activity: `${adminM.openITTickets} tickets`, pending: adminM.criticalITTickets, status: adminM.criticalITTickets > 0 ? "Critical" as const : "Good" as const },
  ];

  const activeAlerts = alerts.filter((a) => !a.resolved).slice(0, 4);
  const revenueBars = [42, 55, 48, 62, 58, 71, 65, 78, 82, 75, 88, 92];

  const quickActions = [
    { label: "Add Staff", href: `${INTERNAL_PREFIX}/admin/staff-roles`, color: "bg-indigo-600" },
    { label: "Create Invoice", href: `${INTERNAL_PREFIX}/accounts/invoices`, color: "bg-emerald-600" },
    { label: "View Reports", href: `${INTERNAL_PREFIX}/admin/reports`, color: "bg-violet-600" },
    { label: "Departments", href: `${INTERNAL_PREFIX}/admin/departments`, color: "bg-sky-600" },
    { label: "Inventory", href: `${INTERNAL_PREFIX}/admin/inventory`, color: "bg-amber-600" },
    { label: "Settings", href: `${INTERNAL_PREFIX}/admin/settings`, color: "bg-slate-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {greeting}, Admin 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{branding.name} — hospital-wide oversight</p>
        </div>
        <div className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {today}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <AdminKpiCard label="Total Patients (Today)" value={nurseM.totalActive + nurseM.outpatientCount} trend="+18.2%" trendUp />
        <AdminKpiCard label="Outpatient Visits" value={nurseM.outpatientCount} trend="+12.8%" trendUp />
        <AdminKpiCard label="Inpatients" value={nurseM.totalActive} trend="+8.4%" trendUp />
        <AdminKpiCard label="Total Revenue (Today)" value={`₦${accM.revenueToday.toLocaleString()}`} trend="+22.6%" trendUp />
        <AdminKpiCard label="Pending Bills" value={accM.payrollPendingCount + rxM.pendingBills} trend="+5.3%" trendUp={false} />
        <AdminKpiCard label="Active Staff" value={hrStaff.filter((s) => s.status === "Active").length || "—"} trend="+4.7%" trendUp />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden p-0 xl:col-span-2">
          <AdminCardTitle
            title="Department Overview"
            action={
              <Link href={`${INTERNAL_PREFIX}/admin/department-monitoring`} className="text-xs font-semibold text-indigo-600 hover:underline">
                View all →
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Activity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => (
                  <tr key={d.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{d.name}</td>
                    <td className="px-5 py-3 text-slate-600">{d.activity}</td>
                    <td className="px-5 py-3 text-slate-600">{d.pending}</td>
                    <td className="px-5 py-3"><AdminStatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <AdminCardTitle title="Revenue Overview" />
          <div className="flex h-44 items-end gap-1.5 px-5 pb-5 pt-4">
            {revenueBars.map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-100 transition hover:bg-indigo-200" style={{ height: `${h}%` }} title={`Day ${i + 1}`} />
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Monthly revenue trend (₦{accM.revenueToday.toLocaleString()} today)</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <AdminCardTitle title="Alerts & Notifications" />
          <div className="divide-y divide-slate-100">
            {activeAlerts.length > 0 ? activeAlerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.level === "Critical" ? "bg-red-500" : "bg-amber-500"}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{a.message}</p>
                  <p className="text-xs text-slate-500">{a.department} · {a.level}</p>
                </div>
              </div>
            )) : (
              <p className="px-5 py-6 text-sm text-slate-500">No active alerts.</p>
            )}
            {adminM.pendingApprovals > 0 && (
              <div className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <p className="text-sm font-medium text-slate-800">{adminM.pendingApprovals} approval{adminM.pendingApprovals > 1 ? "s" : ""} pending review</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <AdminCardTitle title="Financial Summary" />
          <div className="space-y-0 divide-y divide-slate-100 px-5">
            {[
              { label: "Revenue today", value: `₦${accM.revenueToday.toLocaleString()}`, color: "text-emerald-700" },
              { label: "Payroll pending", value: `₦${accM.payrollPendingValue.toLocaleString()}`, color: "text-sky-700" },
              { label: "Pending bills", value: String(rxM.pendingBills + accM.payrollPendingCount), color: "text-amber-700" },
              { label: "Stock alerts", value: String(adminM.stockAlerts), color: adminM.stockAlerts > 0 ? "text-red-600" : "text-slate-700" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-3">
                <span className="text-sm text-slate-600">{row.label}</span>
                <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-5 py-3">
            <Link href={`${INTERNAL_PREFIX}/admin/billing`} className="text-xs font-semibold text-indigo-600 hover:underline">
              Subscription & billing →
            </Link>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-800">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`inline-flex items-center rounded-none px-4 py-2.5 text-sm font-semibold !text-white transition hover:opacity-90 ${a.color}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
