"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useAdminStore } from "@/lib/hooks/use-admin-store";

type StatusLevel = "OK" | "Warning" | "Critical" | "Info";

const STATUS_RING: Record<StatusLevel, string> = {
  OK: "border-emerald-300 bg-emerald-50",
  Warning: "border-amber-300 bg-amber-50",
  Critical: "border-red-300 bg-red-50",
  Info: "border-sky-300 bg-sky-50",
};

const STATUS_DOT: Record<StatusLevel, string> = {
  OK: "bg-emerald-500", Warning: "bg-amber-500 animate-pulse", Critical: "bg-red-500 animate-pulse", Info: "bg-sky-400",
};

const STATUS_TEXT: Record<StatusLevel, string> = {
  OK: "text-emerald-700", Warning: "text-amber-700", Critical: "text-red-700", Info: "text-sky-700",
};

export default function DepartmentMonitoringPage() {
  const { metrics: rxM, restockRequests } = usePharmacyStore();
  const { metrics: accM } = useAccountsStore();
  const { metrics: labM } = useLabStore();
  const { metrics: nurseM } = useNursesStore();
  const { metrics: adminM, itTickets } = useAdminStore();

  const openTickets = itTickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;
  const criticalTickets = itTickets.filter((t) => (t.status === "Open" || t.status === "In Progress") && (t.priority === "Critical" || t.priority === "Urgent")).length;

  const departments: {
    key: string; label: string;
    status: StatusLevel; statusLabel: string;
    metrics: { label: string; value: string | number; alert?: boolean }[];
    icon: string; iconColor: string;
  }[] = [
    {
      key: "frontdesk", label: "Front Desk",
      status: "OK", statusLabel: "Operational",
      metrics: [
        { label: "Outpatients", value: nurseM.outpatientCount },
        { label: "Total Active", value: nurseM.totalActive },
      ],
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      iconColor: "text-sky-600",
    },
    {
      key: "doctors", label: "Doctors",
      status: "OK", statusLabel: "Active",
      metrics: [
        { label: "Pending Rx", value: rxM.pendingPrescriptions },
        { label: "Dispensed Today", value: rxM.dispensedToday },
      ],
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      iconColor: "text-violet-600",
    },
    {
      key: "nurses", label: "Nurses Bay",
      status: nurseM.criticalCount > 0 ? "Critical" : nurseM.wardCount > 0 ? "Warning" : "OK",
      statusLabel: nurseM.criticalCount > 0 ? `${nurseM.criticalCount} Critical` : "Operational",
      metrics: [
        { label: "Total Active", value: nurseM.totalActive },
        { label: "ICU Patients", value: nurseM.icuCount, alert: nurseM.icuCount > 0 },
        { label: "Emergency", value: nurseM.emergencyCount },
      ],
      icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      iconColor: "text-pink-600",
    },
    {
      key: "pharmacy", label: "Pharmacy",
      status: restockRequests.filter((r) => r.status === "Pending" && r.urgency === "Critical").length > 0 ? "Critical" : rxM.pendingPrescriptions > 5 ? "Warning" : "OK",
      statusLabel: rxM.pendingPrescriptions > 0 ? `${rxM.pendingPrescriptions} Pending Rx` : "Operational",
      metrics: [
        { label: "Pending Rx", value: rxM.pendingPrescriptions, alert: rxM.pendingPrescriptions > 5 },
        { label: "Stock Alerts", value: rxM.pendingRestocks, alert: rxM.pendingRestocks > 0 },
      ],
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      iconColor: "text-emerald-600",
    },
    {
      key: "lab", label: "Laboratory",
      status: labM.urgentTests > 0 ? "Warning" : labM.pendingTests > 10 ? "Warning" : "OK",
      statusLabel: labM.urgentTests > 0 ? `${labM.urgentTests} Urgent` : "Operational",
      metrics: [
        { label: "Pending", value: labM.pendingTests },
        { label: "In Progress", value: labM.inProgressTests },
        { label: "Completed", value: labM.completedTests },
      ],
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
      iconColor: "text-sky-600",
    },
    {
      key: "accounts", label: "Accounts",
      status: accM.supplierPendingCount > 5 ? "Warning" : "OK",
      statusLabel: `₦${accM.revenueToday.toLocaleString()} today`,
      metrics: [
        { label: "Revenue Today", value: `₦${accM.revenueToday.toLocaleString()}` },
        { label: "Pending Bills", value: accM.frontDeskPendingCount + accM.consultationPendingCount },
        { label: "Payroll Pending", value: accM.payrollPendingCount, alert: accM.payrollPendingCount > 0 },
      ],
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z",
      iconColor: "text-emerald-700",
    },
    {
      key: "store", label: "Store",
      status: adminM.criticalStock > 0 ? "Critical" : adminM.stockAlerts > 0 ? "Warning" : "OK",
      statusLabel: adminM.criticalStock > 0 ? `${adminM.criticalStock} Critical` : adminM.stockAlerts > 0 ? `${adminM.stockAlerts} Alerts` : "Stocked",
      metrics: [
        { label: "Stock Alerts", value: adminM.stockAlerts, alert: adminM.stockAlerts > 0 },
        { label: "POs Pending", value: adminM.pendingPOs, alert: adminM.pendingPOs > 0 },
      ],
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
      iconColor: "text-amber-600",
    },
    {
      key: "hr", label: "HR",
      status: adminM.pendingLeave > 0 ? "Info" : "OK",
      statusLabel: `${adminM.totalStaff} Staff Active`,
      metrics: [
        { label: "Active Staff", value: adminM.totalStaff },
        { label: "On Leave", value: adminM.staffOnLeave },
        { label: "Leave Pending", value: adminM.pendingLeave, alert: adminM.pendingLeave > 0 },
      ],
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
      iconColor: "text-violet-600",
    },
    {
      key: "it", label: "IT",
      status: criticalTickets > 0 ? "Critical" : openTickets > 3 ? "Warning" : "OK",
      statusLabel: openTickets > 0 ? `${openTickets} Open Tickets` : "All Clear",
      metrics: [
        { label: "Open Tickets", value: openTickets, alert: openTickets > 0 },
        { label: "Critical/Urgent", value: criticalTickets, alert: criticalTickets > 0 },
      ],
      icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2",
      iconColor: "text-cyan-700",
    },
  ];

  const critical = departments.filter((d) => d.status === "Critical");
  const warning = departments.filter((d) => d.status === "Warning");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Overview"
        description="Live operational status of all 9 departments."
      />

      {(critical.length > 0 || warning.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {critical.map((d) => (
            <div key={d.key}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-800 transition">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              {d.label}: {d.statusLabel}
            </div>
          ))}
          {warning.map((d) => (
            <div key={d.key}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 transition">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              {d.label}: {d.statusLabel}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <div key={dept.key}>
            <Card className={`p-5 border-2 transition-all ${STATUS_RING[dept.status]}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200">
                    <svg className={`h-4 w-4 ${dept.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d={dept.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{dept.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[dept.status]}`} />
                      <span className={`text-[11px] font-semibold ${STATUS_TEXT[dept.status]}`}>{dept.statusLabel}</span>
                    </div>
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dept.metrics.map((m) => (
                  <div key={m.label} className="rounded-lg bg-white/70 px-2.5 py-2 text-center">
                    <p className={`text-base font-bold ${m.alert ? STATUS_TEXT[dept.status] : "text-slate-800"}`}>{m.value}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{m.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">All Departments Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Department", "Status", "Key Metric 1", "Key Metric 2"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.key} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{d.label}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[d.status]}`} />
                      <span className={`text-xs font-semibold ${STATUS_TEXT[d.status]}`}>{d.statusLabel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.metrics[0]?.label}: <strong>{d.metrics[0]?.value}</strong></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.metrics[1] ? `${d.metrics[1].label}: ` : ""}<strong>{d.metrics[1]?.value}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
