"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  HrPageHeader,
  HrKpiCard,
  HrStatusBadge,
  HrTabs,
  HrBtnOutline,
  HrAvatar,
  HrCardTitle,
} from "@/components/hr/hr-ui";
import { useHRStore } from "@/lib/hooks/use-hr-store";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import type { AttendanceRecord } from "@/modules/workforce/attendance/types";
import {
  fetchHrAttendanceRecords,
  formatAttendanceClockTime,
  todayAttendanceDate,
} from "@/lib/attendance/client";

const TABS = ["Attendance", "Shift Schedule", "Roster"] as const;

export default function AttendanceShiftsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Attendance");
  const { staff } = useHRStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const today = todayAttendanceDate();

  useEffect(() => {
    let cancelled = false;
    void fetchHrAttendanceRecords({ from: today, to: today })
      .then((data) => { if (!cancelled) setRecords(data); })
      .catch(() => { if (!cancelled) setRecords([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [today]);

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    return { present, absent, late, total: staff.filter((s) => s.status === "Active").length };
  }, [records, staff]);

  return (
    <div className="space-y-6">
      <HrPageHeader
        title="Attendance & Shifts"
        subtitle="Track daily attendance, shift schedules, and department rosters."
        action={
          <div className="flex gap-2">
            <HrBtnOutline href={`${INTERNAL_PREFIX}/hr/attendance`}>Full attendance</HrBtnOutline>
            <HrBtnOutline href={`${INTERNAL_PREFIX}/hr/rota`}>Manage rota</HrBtnOutline>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HrKpiCard label="Present" value={stats.present} accent="green" />
        <HrKpiCard label="Absent" value={stats.absent} accent="red" />
        <HrKpiCard label="Late" value={stats.late} accent="amber" />
        <HrKpiCard label="Total Staff" value={stats.total} />
      </div>

      <HrTabs tabs={TABS} active={tab} onChange={(t) => setTab(t as typeof tab)} />

      {tab === "Attendance" && (
        <Card className="overflow-hidden p-0">
          <HrCardTitle title={`Today's attendance — ${today}`} />
          {loading ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading attendance…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Member</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Shift</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Check In</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Check Out</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <HrAvatar name={r.staffName} size="sm" />
                          <span className="font-medium text-slate-800">{r.staffName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.department}</td>
                      <td className="px-5 py-3 text-slate-600">{r.unit ?? "Morning 8AM–4PM"}</td>
                      <td className="px-5 py-3 text-slate-600">{formatAttendanceClockTime(r.clockInAt)}</td>
                      <td className="px-5 py-3 text-slate-600">{formatAttendanceClockTime(r.clockOutAt)}</td>
                      <td className="px-5 py-3"><HrStatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                        No attendance records for today.{" "}
                        <Link href={`${INTERNAL_PREFIX}/hr/attendance`} className="font-semibold text-violet-600 hover:underline">
                          Open full attendance →
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "Shift Schedule" && (
        <Card className="p-6">
          <p className="text-sm text-slate-600">
            Create and manage shift templates, assign staff to morning, afternoon, and night shifts.
          </p>
          <Link
            href={`${INTERNAL_PREFIX}/hr/rota`}
            className="mt-4 inline-flex rounded-none bg-violet-600 px-4 py-2.5 text-sm font-semibold !text-white hover:bg-violet-500"
          >
            Open Rota Management →
          </Link>
        </Card>
      )}

      {tab === "Roster" && (
        <Card className="p-6">
          <p className="text-sm text-slate-600">
            View weekly rosters by department and publish schedules to staff portals.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Doctors", "Nurses", "Pharmacy", "Front Desk"].map((dept) => (
              <div key={dept} className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-800">{dept}</span>
                <Link href={`${INTERNAL_PREFIX}/hr/rota`} className="text-xs font-semibold text-violet-600 hover:underline">
                  View roster
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
