"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  HrPageHeader,
  HrKpiCard,
  HrStatusBadge,
  HrCardTitle,
  HrAvatar,
} from "@/components/hr/hr-ui";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { useTenantBranding } from "@/modules/tenant/tenant-context";
import { getCurrentQuarter } from "@/lib/performance/quarters";
import type { PerformanceReview } from "@/lib/performance/types";

const STAFF_DEPT_ORDER = ["Doctors", "Nurses", "Pharmacy", "Lab", "Front Desk", "Accounts", "Store", "IT", "HR", "Administration"];

export default function HRDashboardPage() {
  const branding = useTenantBranding();
  const { staff, leaveRequests, metrics, payrollPreps } = useHRStore();
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const currentQuarter = getCurrentQuarter();

  const loadPerformance = useCallback(async () => {
    const res = await fetch("/api/performance/reviews");
    if (res.ok) {
      const data = await res.json();
      setPerformanceReviews(data.reviews ?? []);
    }
  }, []);

  useEffect(() => { void loadPerformance(); }, [loadPerformance]);

  const performanceAlerts = useMemo(() => {
    const current = performanceReviews.filter((r) => r.period === currentQuarter.value);
    const drafts = performanceReviews.filter((r) => r.status === "draft").length;
    const awaitingAck = performanceReviews.filter((r) => r.status === "submitted").length;
    const quarterIncomplete = current.filter((r) => r.status !== "acknowledged").length;
    return { drafts, awaitingAck, quarterIncomplete };
  }, [performanceReviews, currentQuarter.value]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const activeStaff = staff.filter((s) => s.status === "Active");
  const onLeave = staff.filter((s) => s.status === "On Leave");
  const pendingLeave = leaveRequests.filter((l) => l.status === "Pending");
  const payrollReady = payrollPreps.filter((p) => p.status === "Ready");
  const totalPayroll = payrollPreps.reduce((s, p) => s + (p.netTotal ?? 0), 0);

  const staffByDept = STAFF_DEPT_ORDER.map((dept) => {
    const members = staff.filter((s) => s.department === dept);
    return { dept, total: members.length, active: members.filter((s) => s.status === "Active").length };
  }).filter((d) => d.total > 0);

  const deptTotal = staffByDept.reduce((s, d) => s + d.total, 0);
  const deptBars = staffByDept.slice(0, 6);

  const quickActions = [
    { label: "Add Staff", href: `${INTERNAL_PREFIX}/hr/staff-management`, color: "bg-violet-600" },
    { label: "Add Department", href: `${INTERNAL_PREFIX}/hr/departments`, color: "bg-indigo-600" },
    { label: "Schedule Shift", href: `${INTERNAL_PREFIX}/hr/attendance-shifts`, color: "bg-sky-600" },
    { label: "Process Payroll", href: `${INTERNAL_PREFIX}/hr/payroll`, color: "bg-emerald-600" },
    { label: "Performance Reviews", href: `${INTERNAL_PREFIX}/hr/performance`, color: "bg-amber-600" },
    { label: "Leave Requests", href: `${INTERNAL_PREFIX}/hr/leave-management`, color: "bg-rose-600" },
  ];

  const recentActivity = [
    ...leaveRequests.slice(0, 3).map((l) => ({ text: `${l.staffName} — ${l.leaveType} leave (${l.status})`, time: l.submittedAt })),
    ...performanceReviews.slice(0, 2).map((r) => ({
      text: `${r.staffName} — ${r.periodLabel} review (${r.status})`,
      time: r.submittedAt ?? r.createdAt,
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{greeting}, HR 👋</h1>
          <p className="mt-0.5 text-sm text-slate-500">{branding.name} — workforce overview</p>
        </div>
        <div className="rounded-none border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{today}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <HrKpiCard label="Total Staff" value={staff.length} trend="+5.3% vs last month" trendUp />
        <HrKpiCard label="Active Staff" value={activeStaff.length} trend="+4.1%" trendUp />
        <HrKpiCard label="Staff on Leave" value={onLeave.length} trend="-10.0%" trendUp={false} />
        <HrKpiCard label="New Hires (This Month)" value={metrics.newHiresInProgress} trend="+16.7%" trendUp />
        <HrKpiCard label="Payroll Cost (Month)" value={`₦${(totalPayroll || metrics.payrollValueReady || 0).toLocaleString()}`} trend="+8.2%" trendUp />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden p-0 xl:col-span-2">
          <HrCardTitle
            title="Department Head Overview"
            action={
              <Link href={`${INTERNAL_PREFIX}/hr/departments`} className="text-xs font-semibold text-violet-600 hover:underline">
                View all →
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Total Staff</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Active</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffByDept.map((d) => (
                  <tr key={d.dept} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{d.dept}</td>
                    <td className="px-5 py-3 text-slate-600">{d.total}</td>
                    <td className="px-5 py-3 text-slate-600">{d.active}</td>
                    <td className="px-5 py-3"><HrStatusBadge status="Active" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <HrCardTitle title="Staff by Department" />
          <div className="space-y-3 p-5">
            {deptBars.map((d) => (
              <div key={d.dept}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{d.dept}</span>
                  <span className="text-slate-500">{deptTotal > 0 ? Math.round((d.total / deptTotal) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-slate-100">
                  <div className="h-2 bg-violet-500" style={{ width: `${deptTotal > 0 ? (d.total / deptTotal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <HrCardTitle title="Alerts & Notifications" />
          <div className="divide-y divide-slate-100">
            {pendingLeave.length > 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/leave-management`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{pendingLeave.length} leave request{pendingLeave.length > 1 ? "s" : ""} pending review</p>
                  <p className="text-xs text-violet-600">View details →</p>
                </div>
              </Link>
            )}
            {payrollReady.length > 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/payroll`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Payroll for {payrollReady.length} batch{payrollReady.length > 1 ? "es" : ""} ready for review</p>
                  <p className="text-xs text-violet-600">View details →</p>
                </div>
              </Link>
            )}
            {metrics.itAccountsPending > 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/onboarding`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                <p className="text-sm font-medium text-slate-800">{metrics.itAccountsPending} IT account{metrics.itAccountsPending > 1 ? "s" : ""} pending provisioning</p>
              </Link>
            )}
            {performanceAlerts.awaitingAck > 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/performance`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {performanceAlerts.awaitingAck} performance review{performanceAlerts.awaitingAck > 1 ? "s" : ""} awaiting staff acknowledgment
                  </p>
                  <p className="text-xs text-violet-600">View details →</p>
                </div>
              </Link>
            )}
            {performanceAlerts.drafts > 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/performance`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {performanceAlerts.drafts} performance review draft{performanceAlerts.drafts > 1 ? "s" : ""} not yet submitted
                  </p>
                  <p className="text-xs text-violet-600">View details →</p>
                </div>
              </Link>
            )}
            {performanceAlerts.quarterIncomplete > 0 && performanceAlerts.drafts === 0 && performanceAlerts.awaitingAck === 0 && (
              <Link href={`${INTERNAL_PREFIX}/hr/performance`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {performanceAlerts.quarterIncomplete} review{performanceAlerts.quarterIncomplete > 1 ? "s" : ""} in progress for {currentQuarter.periodLabel}
                  </p>
                  <p className="text-xs text-violet-600">View details →</p>
                </div>
              </Link>
            )}
            {pendingLeave.length === 0 && payrollReady.length === 0 && metrics.itAccountsPending === 0
              && performanceAlerts.drafts === 0 && performanceAlerts.awaitingAck === 0 && performanceAlerts.quarterIncomplete === 0 && (
              <p className="px-5 py-6 text-sm text-slate-500">No pending alerts.</p>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <HrCardTitle title="Leave Summary (This Month)" />
          <div className="space-y-0 divide-y divide-slate-100 px-5">
            {["Annual", "Sick", "Maternity", "Casual"].map((type) => {
              const count = leaveRequests.filter((l) => l.leaveType === type && l.status === "Approved").length;
              return (
                <div key={type} className="flex justify-between py-3">
                  <span className="text-sm text-slate-600">{type}</span>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <HrCardTitle title="Recent Activity" />
        <div className="divide-y divide-slate-100">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <HrAvatar name={a.text.split(" ")[0] ?? "?"} size="sm" />
              <div>
                <p className="text-sm text-slate-800">{a.text}</p>
                <p className="text-xs text-slate-400">{a.time}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="px-5 py-6 text-sm text-slate-500">No recent activity.</p>
          )}
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-800">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={`flex items-center justify-center rounded-none px-3 py-3 text-center text-sm font-semibold !text-white transition hover:opacity-90 ${a.color}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
