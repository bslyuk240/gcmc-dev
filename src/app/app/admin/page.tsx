"use client";

import { Card } from "@/components/ui/card";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useAdminStore } from "@/lib/hooks/use-admin-store";


export default function AdminDashboardPage() {
  const { metrics } = usePharmacyStore();
  const { metrics: accMetrics } = useAccountsStore();
  const { metrics: labMetrics } = useLabStore();
  const { metrics: nurseMetrics } = useNursesStore();
  const { metrics: adminMetrics, alerts } = useAdminStore();

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Admin Dashboard</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Hospital-wide oversight — operations, finances, and staffing</p>
      </div>

      {/* KPI row — sourced from live stores */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "REVENUE TODAY", value: `₦${accMetrics.revenueToday.toLocaleString()}`, sub: "Collected across all depts", color: "text-emerald-700" },
          { label: "ACTIVE PATIENTS", value: nurseMetrics.totalActive, sub: "Across all nursing units", color: "text-slate-900" },
          { label: "PAYROLL PENDING", value: accMetrics.payrollPendingCount, sub: `₦${accMetrics.payrollPendingValue.toLocaleString()} awaiting approval`, color: accMetrics.payrollPendingCount > 0 ? "text-sky-700" : "text-slate-400" },
          { label: "OPEN IT TICKETS", value: adminMetrics.openITTickets, sub: adminMetrics.criticalITTickets > 0 ? `${adminMetrics.criticalITTickets} critical/urgent` : "No critical tickets", color: adminMetrics.criticalITTickets > 0 ? "text-red-600" : "text-slate-900" },
        ].map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-xs text-slate-500">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* 9-Department Status Strip */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">All Departments — Live Status</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {[
            { label: "Front Desk", dot: "bg-emerald-500", status: "OK" },
            { label: "Doctors", dot: "bg-emerald-500", status: "OK" },
            { label: "Nurses", dot: nurseMetrics.criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500", status: nurseMetrics.criticalCount > 0 ? "Critical" : "OK" },
            { label: "Pharmacy", dot: metrics.pendingPrescriptions > 5 ? "bg-amber-500 animate-pulse" : "bg-emerald-500", status: metrics.pendingPrescriptions > 5 ? "Busy" : "OK" },
            { label: "Lab", dot: labMetrics.urgentTests > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500", status: labMetrics.urgentTests > 0 ? "Urgent" : "OK" },
            { label: "Accounts", dot: "bg-emerald-500", status: "OK" },
            { label: "Store", dot: adminMetrics.criticalStock > 0 ? "bg-red-500 animate-pulse" : adminMetrics.stockAlerts > 0 ? "bg-amber-500" : "bg-emerald-500", status: adminMetrics.criticalStock > 0 ? "Critical" : "OK" },
            { label: "HR", dot: adminMetrics.pendingLeave > 0 ? "bg-sky-500" : "bg-emerald-500", status: "OK" },
            { label: "IT", dot: adminMetrics.criticalITTickets > 0 ? "bg-red-500 animate-pulse" : adminMetrics.openITTickets > 0 ? "bg-amber-500" : "bg-emerald-500", status: adminMetrics.criticalITTickets > 0 ? "Critical" : "OK" },
          ].map((d) => (
            <div key={d.label}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-3 transition">
              <span className={`h-2.5 w-2.5 rounded-full ${d.dot}`} />
              <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{d.label}</span>
              <span className={`text-[10px] ${d.status === "OK" ? "text-emerald-600" : d.status === "Critical" ? "text-red-600 font-bold" : "text-amber-600"}`}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals & Alerts strip */}
      {(adminMetrics.pendingApprovals > 0 || alerts.filter((a) => !a.resolved && a.level === "Critical").length > 0) && (
        <div className="flex flex-wrap gap-3">
          {adminMetrics.pendingApprovals > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-800">{adminMetrics.pendingApprovals} approval{adminMetrics.pendingApprovals > 1 ? "s" : ""} pending review</span>
            </div>
          )}
          {adminMetrics.escalatedApprovals > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-bold text-orange-800">{adminMetrics.escalatedApprovals} escalated — requires urgent attention</span>
            </div>
          )}
          {alerts.filter((a) => !a.resolved && a.level === "Critical").map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-800">{a.department}: {a.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
