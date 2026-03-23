"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useHRStore } from "@/lib/hooks/use-hr-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

const DEPT_COLORS: Record<string, string> = {
  Doctors: "bg-violet-50 text-violet-700",
  Nurses: "bg-pink-50 text-pink-700",
  Pharmacy: "bg-emerald-50 text-emerald-700",
  Lab: "bg-sky-50 text-sky-700",
  "Front Desk": "bg-amber-50 text-amber-700",
  Accounts: "bg-teal-50 text-teal-700",
  IT: "bg-cyan-50 text-cyan-700",
  HR: "bg-slate-100 text-slate-700",
  Store: "bg-orange-50 text-orange-700",
  Administration: "bg-indigo-50 text-indigo-700",
};

const LEAVE_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

const STAFF_DEPT_ORDER = ["Doctors", "Nurses", "Pharmacy", "Lab", "Front Desk", "Accounts", "Store", "IT", "HR", "Administration"];

export default function HRDashboardPage() {
  const { staff, leaveRequests, onboarding, metrics, payrollPreps } = useHRStore();

  const pendingLeave = leaveRequests.filter((l) => l.status === "Pending");
  const recentLeave = leaveRequests.slice(0, 5);
  const pendingOnboarding = onboarding.filter((o) => o.status !== "Completed");
  const payrollReady = payrollPreps.filter((p) => p.status === "Ready");
  const contractsExpiring = staff.filter((s) => s.contractEndDate);
  const suspendedStaff = staff.filter((s) => s.status === "Suspended");

  const staffByDept = STAFF_DEPT_ORDER.map((dept) => {
    const members = staff.filter((s) => s.department === dept);
    return { dept, total: members.length, active: members.filter((s) => s.status === "Active").length };
  }).filter((d) => d.total > 0);


  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="HR Dashboard"
        description="Workforce overview — headcount, leave, onboarding, payroll preparation, and staffing compliance."
      />

      {/* Alerts */}
      {(pendingLeave.length > 0 || metrics.itAccountsPending > 0 || suspendedStaff.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingLeave.length > 0 && (
            <Link href={`${INTERNAL_PREFIX}/hr/leave-management`}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {pendingLeave.length} leave request{pendingLeave.length > 1 ? "s" : ""} pending review
            </Link>
          )}
          {metrics.itAccountsPending > 0 && (
            <Link href={`${INTERNAL_PREFIX}/hr/onboarding`}
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              {metrics.itAccountsPending} staff awaiting IT system access
            </Link>
          )}
          {suspendedStaff.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-800">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {suspendedStaff.length} staff on suspension — review required
            </div>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-3">
        {[
          { label: "Total Staff", value: metrics.totalStaff, color: "text-slate-900" },
          { label: "Active", value: metrics.activeStaff, color: "text-emerald-700" },
          { label: "On Leave", value: metrics.onLeave, color: metrics.onLeave > 5 ? "text-amber-600" : "text-slate-500" },
          { label: "Leave Pending", value: metrics.pendingLeave, color: metrics.pendingLeave > 0 ? "text-amber-600" : "text-slate-500" },
        ].map((k) => (
          <Card key={k.label} className="flex flex-1 items-center gap-2.5 px-3 py-3 sm:px-4">
            <p className={`text-xl font-bold shrink-0 sm:text-2xl ${k.color}`}>{k.value}</p>
            <p className="text-[10px] font-semibold leading-tight text-slate-500 sm:text-xs">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Leave requests */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900">Leave Requests</h3>
                {pendingLeave.length > 0 && <p className="text-xs text-amber-600 font-semibold">{pendingLeave.length} pending review</p>}
              </div>
              <Link href={`${INTERNAL_PREFIX}/hr/leave-management`} className="text-sm font-semibold text-blue-600 hover:underline">Manage all →</Link>
            </div>
            <div className="space-y-3 px-4 py-4 md:hidden">
              {recentLeave.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  No leave requests yet.
                </div>
              ) : (
                recentLeave.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                      r.status === "Pending" ? "ring-1 ring-amber-100" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{r.staffName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{r.department}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${LEAVE_STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <MobileMeta label="Type" value={r.leaveType} />
                      <MobileMeta label="Dates" value={`${r.startDate} - ${r.endDate}`} />
                      <MobileMeta label="Days" value={`${r.days} day${r.days === 1 ? "" : "s"}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {["Staff", "Department", "Type", "Dates", "Days", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLeave.map((r) => (
                    <tr key={r.id} className={`hover:bg-slate-50 ${r.status === "Pending" ? "bg-amber-50/20" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.staffName}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DEPT_COLORS[r.department] ?? "bg-slate-100 text-slate-600"}`}>{r.department}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.leaveType}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.startDate} – {r.endDate}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{r.days}d</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LEAVE_STATUS_STYLES[r.status]}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Staff by department */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Workforce by Department</h3>
              <Link href={`${INTERNAL_PREFIX}/hr/department-staffing`} className="text-xs font-semibold text-blue-600 hover:underline">View full →</Link>
            </div>
            <div className="space-y-3">
              {staffByDept.map((d) => (
                <div key={d.dept} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-center ${DEPT_COLORS[d.dept] ?? "bg-slate-100 text-slate-600"}`}>{d.dept}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400" style={{ width: `${(d.active / (staffByDept[0]?.total || 1)) * 100}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm font-semibold text-slate-900">{d.active}/{d.total}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Payroll prep status */}
          {payrollPreps.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900">Payroll Preparation</h3>
                  {payrollReady.length > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold">{payrollReady.length} batch{payrollReady.length > 1 ? "es" : ""} ready to submit to Accounts</p>
                  )}
                </div>
                <Link href={`${INTERNAL_PREFIX}/hr/payroll`} className="text-sm font-semibold text-blue-600 hover:underline">Open Payroll →</Link>
              </div>
              <div className="divide-y divide-slate-100">
                {payrollPreps.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{p.period} — {p.department}</p>
                      <p className="text-xs text-slate-400">{p.staffCount} staff · ₦{p.netTotal.toLocaleString()} net</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "Ready" ? "bg-emerald-50 text-emerald-700" : p.status === "Submitted to Accounts" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { label: "Add Staff", href: `${INTERNAL_PREFIX}/hr/staff-directory` },
                { label: "Attendance", href: `${INTERNAL_PREFIX}/hr/attendance` },
                { label: "Leave Requests", href: `${INTERNAL_PREFIX}/hr/leave-management` },
                { label: "Leave Settings", href: `${INTERNAL_PREFIX}/hr/leave-settings` },
                { label: "Notifications", href: `${INTERNAL_PREFIX}/hr/notifications` },
                { label: "Onboarding", href: `${INTERNAL_PREFIX}/hr/onboarding` },
                { label: "Dept Staffing", href: `${INTERNAL_PREFIX}/hr/department-staffing` },
                { label: "Payroll Prep", href: `${INTERNAL_PREFIX}/hr/payroll` },
                { label: "Roles & Access", href: `${INTERNAL_PREFIX}/hr/roles-permissions` },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Active onboarding */}
          {pendingOnboarding.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Active Onboarding</h3>
                <Link href={`${INTERNAL_PREFIX}/hr/onboarding`} className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-3">
                {pendingOnboarding.map((o) => (
                  <div key={o.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-slate-900">{o.staffName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.status === "IT Pending" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{o.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{o.department} · {o.role}</p>
                    {!o.itAccountCreated && (
                      <p className="text-[10px] text-sky-600 font-semibold mt-1">⏳ IT account creation pending</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contract alerts */}
          {contractsExpiring.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-slate-900 mb-3">Contract Alerts</h3>
              <div className="space-y-2">
                {contractsExpiring.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs">
                    <span className="h-1.5 w-1.5 mt-1 rounded-full bg-amber-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">{s.name}</p>
                      <p className="text-slate-400">{s.department} · expires {s.contractEndDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Upcoming events */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Upcoming</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
