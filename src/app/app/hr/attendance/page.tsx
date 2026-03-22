"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { DB_DEPARTMENT_KEYS, departmentThemes } from "@/lib/constants/navigation";
import type { AttendanceRecord } from "@/modules/workforce/attendance/types";
import {
  currentMonthRange,
  fetchHrAttendanceRecords,
  formatAttendanceClockTime,
  formatAttendanceDate,
  todayAttendanceDate,
} from "@/lib/attendance/client";

function departmentLabel(dept: string) {
  return departmentThemes[dept as keyof typeof departmentThemes]?.label ?? dept;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "Present":
      return "bg-emerald-50 text-emerald-700";
    case "Late":
      return "bg-amber-50 text-amber-700";
    case "Half-day":
      return "bg-sky-50 text-sky-700";
    case "Absent":
      return "bg-red-50 text-red-700";
    case "Leave":
      return "bg-violet-50 text-violet-700";
    case "Holiday":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function HrAttendancePage() {
  const monthRange = useMemo(() => currentMonthRange(), []);
  const [department, setDepartment] = useState<string>("all");
  const [from, setFrom] = useState(monthRange.from);
  const [to, setTo] = useState(monthRange.to);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchHrAttendanceRecords({
          department: department === "all" ? undefined : department,
          from,
          to,
        });
        if (!cancelled) {
          setRecords(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load attendance records.");
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [department, from, to]);

  const present = records.filter((record) => record.status === "Present" || record.status === "Late").length;
  const late = records.filter((record) => record.status === "Late").length;
  const openShifts = records.filter((record) => record.clockInAt && !record.clockOutAt).length;
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  const todayCount = records.filter((record) => record.attendanceDate === todayAttendanceDate()).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Attendance"
        description="Review staff clock-ins, open shifts, and monthly attendance records across departments."
      />

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Records", value: records.length, color: "text-slate-900" },
          { label: "Present / Late", value: present, color: "text-emerald-700" },
          { label: "Open Shifts", value: openShifts, color: "text-amber-700" },
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, color: "text-indigo-700" },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-3 px-4 py-4">
            <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Department</span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            >
              <option value="all">All departments</option>
              {DB_DEPARTMENT_KEYS.map((dept) => (
                <option key={dept} value={dept}>
                  {departmentLabel(dept)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
          </label>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Attendance Records</h3>
            <p className="text-xs text-slate-500">
              {records.length} records in view{todayCount > 0 ? ` · ${todayCount} today` : ""}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {department === "all" ? "All departments" : departmentLabel(department)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {["Date", "Staff", "Department", "Unit", "Clock In", "Clock Out", "Hours", "Status"].map((header) => (
                  <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    No attendance records found for the selected range.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatAttendanceDate(record.attendanceDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{record.staffName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                        {departmentLabel(record.department)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{record.unit ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatAttendanceClockTime(record.clockInAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatAttendanceClockTime(record.clockOutAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">
                      {record.hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">Open Shifts</h3>
          <div className="space-y-2">
            {records.filter((record) => record.clockInAt && !record.clockOutAt).length > 0 ? (
              records
                .filter((record) => record.clockInAt && !record.clockOutAt)
                .slice(0, 5)
                .map((record) => (
                  <div key={record.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{record.staffName}</p>
                        <p className="text-xs text-slate-500">
                          {departmentLabel(record.department)} · {record.role}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Clocked in
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No open shifts in the selected range.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-bold text-slate-900">Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Present / Late</span>
              <span className="font-semibold text-slate-900">{present}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Late arrivals</span>
              <span className="font-semibold text-slate-900">{late}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Open shifts</span>
              <span className="font-semibold text-slate-900">{openShifts}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-500">Records for today</span>
              <span className="font-semibold text-slate-900">{todayCount}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
