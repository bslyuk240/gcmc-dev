"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useHMSSession } from "@/modules/rbac/hooks";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import { isWorkforceAdmin } from "@/lib/workforce/access";
import type { WorkforceMetrics, WorkforceUnitOverview } from "@/lib/workforce/types";

export default function WorkforceReportsPage() {
  const session = useHMSSession();
  const [metrics, setMetrics] = useState<WorkforceMetrics | null>(null);
  const [units, setUnits] = useState<WorkforceUnitOverview[]>([]);
  const [unitName, setUnitName] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      if (isWorkforceAdmin(session)) {
        const res = await fetch("/api/workforce/metrics?overview=1");
        if (res.ok) {
          const data = await res.json();
          setUnits(data.units ?? []);
        }
      } else {
        const unit = await fetchMyNcUnit(session.staff_id);
        setUnitName(unit);
        const params = unit ? `?unitName=${encodeURIComponent(unit)}` : "";
        const res = await fetch(`/api/workforce/metrics${params}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics ?? null);
        }
      }
    })();
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Reports"
        description="Attendance, leave, and task completion summaries."
      />

      {isWorkforceAdmin(session!) && units.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-slate-900">All Units Overview</h3>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                {["Unit", "Staff", "Active", "On Leave", "Absent Today", "Attendance %", "Pending Tasks"].map((h) => (
                  <th key={h} className="px-5 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
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
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "On duty today", value: metrics?.onDutyToday ?? 0 },
            { label: "Absent today", value: metrics?.absentToday ?? 0 },
            { label: "Pending leave", value: metrics?.pendingLeave ?? 0 },
            { label: "Assigned tasks", value: metrics?.assignedTasks ?? 0 },
            { label: "Completed today", value: metrics?.completedTasksToday ?? 0 },
            { label: "Overdue tasks", value: metrics?.overdueTasks ?? 0 },
          ].map((item) => (
            <Card key={item.label} className="border-0 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
              {unitName ? <p className="mt-1 text-xs text-slate-400">{unitName}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
