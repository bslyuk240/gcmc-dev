"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import type { WorkforceUnitOverview } from "@/lib/workforce/types";

export default function AdminWorkforceOverviewPage() {
  const [units, setUnits] = useState<WorkforceUnitOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/workforce/metrics?overview=1")
      .then((res) => (res.ok ? res.json() : { units: [] }))
      .then((data) => setUnits(data.units ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totals = units.reduce(
    (acc, u) => ({
      staff: acc.staff + u.totalStaff,
      active: acc.active + u.activeStaff,
      onLeave: acc.onLeave + u.onLeave,
      absent: acc.absent + u.absentToday,
    }),
    { staff: 0, active: 0, onLeave: 0, absent: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Overview"
        description="Unified view of all non-clinical units — transport, security, cleaning, and logistics."
        action={
          <Link href={`${INTERNAL_PREFIX}/non_clinical/dashboard`} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
            Open Workforce Portal
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Staff", value: totals.staff },
          { label: "Active Staff", value: totals.active },
          { label: "On Leave", value: totals.onLeave },
          { label: "Absent Today", value: totals.absent },
        ].map((card) => (
          <Card key={card.label} className="border-0 bg-lime-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-lime-800">{loading ? "—" : card.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">By Department (Unit)</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {["Unit", "Total Staff", "Active", "On Leave", "Absent Today", "Attendance %", "Pending Tasks"].map((h) => (
                <th key={h} className="px-5 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : units.map((u) => (
              <tr key={u.unitName}>
                <td className="px-5 py-3 font-medium">{u.unitName}</td>
                <td className="px-5 py-3">{u.totalStaff}</td>
                <td className="px-5 py-3">{u.activeStaff}</td>
                <td className="px-5 py-3">{u.onLeave}</td>
                <td className="px-5 py-3">{u.absentToday}</td>
                <td className="px-5 py-3">{u.attendanceRate}%</td>
                <td className="px-5 py-3">{u.pendingTasks}</td>
              </tr>
            ))}
            {!loading && units.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No workforce units configured yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
