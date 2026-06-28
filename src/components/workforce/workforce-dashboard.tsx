"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import type { WorkforceMetrics } from "@/lib/workforce/types";

type Props = {
  unitName?: string | null;
  title?: string;
  description?: string;
};

export function WorkforceDashboard({ unitName, title, description }: Props) {
  const [metrics, setMetrics] = useState<WorkforceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (unitName) params.set("unitName", unitName);
    fetch(`/api/workforce/metrics?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMetrics(data?.metrics ?? null))
      .finally(() => setLoading(false));
  }, [unitName]);

  const cards = [
    { label: "On Duty Today", value: metrics?.onDutyToday ?? 0, sub: "Scheduled shifts", color: "text-emerald-700", bg: "bg-emerald-50", href: `${INTERNAL_PREFIX}/non_clinical/attendance-rota` },
    { label: "Absent Today", value: metrics?.absentToday ?? 0, sub: "Not checked in", color: "text-red-700", bg: "bg-red-50", href: `${INTERNAL_PREFIX}/non_clinical/attendance-rota` },
    { label: "Pending Leave", value: metrics?.pendingLeave ?? 0, sub: "Awaiting approval", color: "text-amber-700", bg: "bg-amber-50", href: `${INTERNAL_PREFIX}/non_clinical/leave` },
    { label: "Assigned Tasks", value: metrics?.assignedTasks ?? 0, sub: `${metrics?.overdueTasks ?? 0} overdue`, color: "text-violet-700", bg: "bg-violet-50", href: `${INTERNAL_PREFIX}/non_clinical/tasks` },
  ];

  return (
    <div className="space-y-6">
      {(title || description) && (
        <div>
          {title ? <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1> : null}
          {description ? <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{description}</p> : null}
          {unitName ? (
            <span className="mt-2 inline-flex rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800">
              {unitName}
            </span>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className={`h-full border-0 p-4 sm:p-5 ${card.bg} transition hover:shadow-md`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold sm:text-3xl ${card.color}`}>
                {loading ? "—" : card.value}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{card.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Workforce Summary</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Active staff</span><strong>{loading ? "—" : metrics?.unitStaffActive ?? 0}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Total staff</span><strong>{loading ? "—" : metrics?.unitStaffTotal ?? 0}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">On leave</span><strong>{loading ? "—" : metrics?.onLeave ?? 0}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Tasks completed today</span><strong>{loading ? "—" : metrics?.completedTasksToday ?? 0}</strong></div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Quick Links</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { href: `${INTERNAL_PREFIX}/non_clinical/my-department`, label: "My Department" },
              { href: `${INTERNAL_PREFIX}/non_clinical/my-team`, label: "My Team" },
              { href: `${INTERNAL_PREFIX}/non_clinical/tasks`, label: "Tasks" },
              { href: "/staff/dashboard", label: "Staff Portal" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">
                {link.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
