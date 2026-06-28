"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/admin-ui";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

type DeptRow = {
  name: string;
  hod: string;
  members: number;
  activity: string;
  pending: number;
  status: "Good" | "Warning" | "Critical";
  monitorHref: string;
};

export default function AdminDepartmentsPage() {
  const { metrics: rxM } = usePharmacyStore();
  const { metrics: accM } = useAccountsStore();
  const { metrics: labM } = useLabStore();
  const { metrics: nurseM } = useNursesStore();
  const { metrics: adminM, hrStaff, itTickets } = useAdminStore();

  const openTickets = itTickets.filter((t) => t.status === "Open" || t.status === "In Progress").length;

  const departments: DeptRow[] = [
    {
      name: "Front Desk",
      hod: "Grace Boateng",
      members: hrStaff.filter((s) => s.department === "Front Desk").length || 8,
      activity: `${nurseM.outpatientCount} outpatients`,
      pending: 0,
      status: "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/frontdesk`,
    },
    {
      name: "Doctors",
      hod: "Dr. Nwosu",
      members: hrStaff.filter((s) => s.department === "Doctors").length || 12,
      activity: `${rxM.pendingPrescriptions} pending Rx`,
      pending: rxM.pendingPrescriptions,
      status: "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/doctors`,
    },
    {
      name: "Nurses Bay",
      hod: "Nurse Patricia",
      members: hrStaff.filter((s) => s.department === "Nurses").length || 18,
      activity: `${nurseM.totalActive} active patients`,
      pending: nurseM.criticalCount,
      status: nurseM.criticalCount > 0 ? "Critical" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/nurses`,
    },
    {
      name: "Pharmacy",
      hod: "James Adu",
      members: hrStaff.filter((s) => s.department === "Pharmacy").length || 6,
      activity: `${rxM.dispensedToday} dispensed today`,
      pending: rxM.pendingPrescriptions,
      status: rxM.pendingPrescriptions > 5 ? "Warning" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/pharmacy`,
    },
    {
      name: "Laboratory",
      hod: "Lab Supervisor",
      members: hrStaff.filter((s) => s.department === "Lab").length || 5,
      activity: `${labM.urgentTests} urgent tests`,
      pending: labM.urgentTests,
      status: labM.urgentTests > 0 ? "Warning" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/lab`,
    },
    {
      name: "Accounts",
      hod: "Kofi Accounts",
      members: hrStaff.filter((s) => s.department === "Accounts").length || 4,
      activity: `₦${accM.revenueToday.toLocaleString()} today`,
      pending: accM.payrollPendingCount,
      status: "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/accounts`,
    },
    {
      name: "Store",
      hod: "Store Manager",
      members: hrStaff.filter((s) => s.department === "Store").length || 3,
      activity: `${adminM.stockAlerts} stock alerts`,
      pending: adminM.pendingPOs,
      status: adminM.criticalStock > 0 ? "Critical" : adminM.stockAlerts > 0 ? "Warning" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/store`,
    },
    {
      name: "HR",
      hod: "HR Manager",
      members: hrStaff.filter((s) => s.department === "HR").length || 3,
      activity: `${adminM.pendingLeave} leave requests`,
      pending: adminM.pendingLeave,
      status: adminM.pendingLeave > 0 ? "Warning" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/hr`,
    },
    {
      name: "IT",
      hod: "Kwame IT",
      members: hrStaff.filter((s) => s.department === "IT").length || 2,
      activity: `${openTickets} open tickets`,
      pending: openTickets,
      status: adminM.criticalITTickets > 0 ? "Critical" : openTickets > 0 ? "Warning" : "Good",
      monitorHref: `${INTERNAL_PREFIX}/admin/it`,
    },
  ];

  const activeCount = departments.filter((d) => d.status !== "Critical").length;
  const alertCount = departments.filter((d) => d.status !== "Good").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Departments"
        subtitle="Hospital organizational structure, heads of department, and staffing."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Departments", value: departments.length },
          { label: "Active Departments", value: activeCount },
          { label: "Departments with Alerts", value: alertCount },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Head (HOD)</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Members</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Activity</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.name} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-semibold text-slate-800">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600">{d.hod}</td>
                  <td className="px-5 py-3 text-slate-600">{d.members}</td>
                  <td className="px-5 py-3 text-slate-600">{d.activity}</td>
                  <td className="px-5 py-3 text-slate-600">{d.pending}</td>
                  <td className="px-5 py-3">
                    <AdminStatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3">
                    <Link href={d.monitorHref} className="text-xs font-semibold text-indigo-600 hover:underline">
                      Monitor →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
