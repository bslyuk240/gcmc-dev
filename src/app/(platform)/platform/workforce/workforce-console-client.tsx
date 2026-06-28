"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { enterHospitalPortalAction } from "@/server/actions/platform/enter-portal";
import type { PlatformHospitalWorkforceSummary } from "@/lib/workforce/types";
import {
  Card,
  PageHeader,
  StatusBadge,
  platformBtnAccentOutline,
} from "@/components/platform/page-shell";

type Props = {
  summaries: PlatformHospitalWorkforceSummary[];
};

export function PlatformWorkforceConsole({ summaries }: Props) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("all");
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (selectedHospitalId === "all"
      ? summaries
      : summaries.filter((s) => s.hospitalId === selectedHospitalId)),
    [summaries, selectedHospitalId],
  );

  const totals = filtered.reduce(
    (acc, s) => ({
      staff: acc.staff + s.metrics.unitStaffTotal,
      active: acc.active + s.metrics.unitStaffActive,
      onDuty: acc.onDuty + s.metrics.onDutyToday,
      absent: acc.absent + s.metrics.absentToday,
      onLeave: acc.onLeave + s.metrics.onLeave,
      pendingLeave: acc.pendingLeave + s.metrics.pendingLeave,
      tasks: acc.tasks + s.metrics.assignedTasks,
    }),
    { staff: 0, active: 0, onDuty: 0, absent: 0, onLeave: 0, pendingLeave: 0, tasks: 0 },
  );

  const unitRows = filtered.flatMap((s) =>
    s.units.map((u) => ({ ...u, hospitalId: s.hospitalId, hospitalName: s.hospitalName })),
  );

  const selectedHospital = summaries.find((s) => s.hospitalId === selectedHospitalId);

  function handleEnterPortal(hospitalId: string) {
    setEnteringId(hospitalId);
    setError(null);
    startTransition(async () => {
      const result = await enterHospitalPortalAction(hospitalId, "non_clinical");
      if (!result.success) {
        setError(result.error);
        setEnteringId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce"
        subtitle="Cross-tenant view of non-clinical staff — transport, security, cleaning, and logistics."
        action={
          selectedHospital && selectedHospital.hospitalStatus !== "suspended" ? (
            <Button
              disabled={isPending && enteringId === selectedHospital.hospitalId}
              onClick={() => handleEnterPortal(selectedHospital.hospitalId)}
              className="rounded-xl bg-lime-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lime-700"
            >
              {isPending && enteringId === selectedHospital.hospitalId
                ? "Opening portal…"
                : `Open ${selectedHospital.hospitalName} Workforce Portal`}
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="hospital-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter by hospital
          </label>
          <select
            id="hospital-filter"
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All hospitals ({summaries.length})</option>
            {summaries.map((s) => (
              <option key={s.hospitalId} value={s.hospitalId}>
                {s.hospitalName}
              </option>
            ))}
          </select>
        </div>
        {selectedHospital ? (
          <div className="flex items-center gap-2 pb-1">
            <StatusBadge status={selectedHospital.hospitalStatus} />
            <span className="text-xs text-slate-400">{selectedHospital.hospitalSlug}</span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Total staff", value: totals.staff },
          { label: "Active", value: totals.active },
          { label: "On duty today", value: totals.onDuty },
          { label: "Absent today", value: totals.absent },
          { label: "On leave", value: totals.onLeave },
          { label: "Pending leave", value: totals.pendingLeave },
          { label: "Open tasks", value: totals.tasks },
        ].map((card) => (
          <Card key={card.label} className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
          </Card>
        ))}
      </div>

      {selectedHospitalId === "all" ? (
        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-800">Workforce by hospital</h2>
            <p className="mt-0.5 text-xs text-slate-400">Select a hospital to drill down or open its portal.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Hospital", "Status", "Staff", "Active", "On duty", "Absent", "On leave", "Pending leave", "Tasks", ""].map((h) => (
                    <th key={h || "actions"} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.hospitalId} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{s.hospitalName}</p>
                      <p className="text-xs text-slate-400">{s.hospitalSlug}</p>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.hospitalStatus} /></td>
                    <td className="px-5 py-3.5">{s.metrics.unitStaffTotal}</td>
                    <td className="px-5 py-3.5">{s.metrics.unitStaffActive}</td>
                    <td className="px-5 py-3.5">{s.metrics.onDutyToday}</td>
                    <td className="px-5 py-3.5">{s.metrics.absentToday}</td>
                    <td className="px-5 py-3.5">{s.metrics.onLeave}</td>
                    <td className="px-5 py-3.5">{s.metrics.pendingLeave}</td>
                    <td className="px-5 py-3.5">{s.metrics.assignedTasks}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedHospitalId(s.hospitalId)}
                          className={platformBtnAccentOutline}
                        >
                          View units
                        </button>
                        {s.hospitalStatus !== "suspended" ? (
                          <button
                            type="button"
                            disabled={isPending && enteringId === s.hospitalId}
                            onClick={() => handleEnterPortal(s.hospitalId)}
                            className="rounded-lg bg-lime-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-lime-700 disabled:opacity-60"
                          >
                            Enter portal
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-sm text-slate-400">
                      No hospitals found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Units — {selectedHospital?.hospitalName}</h2>
              <p className="mt-0.5 text-xs text-slate-400">Transport, security, cleaning, and other non-clinical units.</p>
            </div>
            <Link
              href={`/platform/hospitals/${selectedHospitalId}`}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Hospital details →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Unit", "Staff", "Active", "On leave", "Absent today", "Attendance %", "Pending tasks"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitRows.map((u) => (
                  <tr key={`${u.hospitalId}-${u.unitName}`}>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{u.unitName}</td>
                    <td className="px-5 py-3.5">{u.totalStaff}</td>
                    <td className="px-5 py-3.5">{u.activeStaff}</td>
                    <td className="px-5 py-3.5">{u.onLeave}</td>
                    <td className="px-5 py-3.5">{u.absentToday}</td>
                    <td className="px-5 py-3.5">{u.attendanceRate}%</td>
                    <td className="px-5 py-3.5">{u.pendingTasks}</td>
                  </tr>
                ))}
                {unitRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                      No workforce units with assigned staff for this hospital yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Entering a hospital opens the full Workforce Portal with platform operator access. Use the banner in-tenant to return to this console.
      </p>
    </div>
  );
}
