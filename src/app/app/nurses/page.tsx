"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-amber-50 text-amber-700",
  Stable: "bg-emerald-50 text-emerald-700",
};

const UNIT_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Outpatient: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", dot: "bg-sky-400" },
  Ward:       { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  Emergency:  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  ICU:        { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
};

const UNIT_ROUTES: Record<string, string> = {
  Outpatient: `${INTERNAL_PREFIX}/nurses/triage`,
  Ward: `${INTERNAL_PREFIX}/nurses/ward`,
  Emergency: `${INTERNAL_PREFIX}/nurses/emergency`,
  ICU: `${INTERNAL_PREFIX}/nurses/icu`,
};

const LAB_PENDING_STATUSES = new Set(["Pending", "Sample Collected", "In Progress"]);

function fmtDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number) {
  return `NGN ${value.toLocaleString()}`;
}

export default function NursesDashboardPage() {
  const { allPatients, metrics, procedures, sampleRequests } = useNursesStore();
  const { nursingCharges } = useAccountsStore();
  const { tests } = useLabStore();

  const activePatients = [...allPatients.filter((patient) => patient.status === "Active")].sort((left, right) => {
    const priorityRank = { Critical: 0, High: 1, Watch: 2, Stable: 3 };
    return priorityRank[left.priority] - priorityRank[right.priority];
  });

  const criticalPatients = activePatients.filter((patient) => patient.priority === "Critical");
  const criticalHighCount = activePatients.filter(
    (patient) => patient.priority === "Critical" || patient.priority === "High",
  ).length;
  const recentProcedures = procedures.slice(0, 5);
  const pendingProcedureQueue = procedures.filter((procedure) => procedure.billStatus === "Pending");
  const pendingSamples = sampleRequests.filter((request) => request.status === "Ordered");
  const activeLabRequests = tests.filter((test) => LAB_PENDING_STATUSES.has(test.status)).length;
  const accountsBillingQueue = nursingCharges.filter(
    (charge) => charge.status === "Pending" || charge.status === "Billed",
  ).length;

  const stats = [
    {
      label: "Total Active Patients",
      value: metrics.totalActive,
      sub: "Across all nursing units",
      color: "text-slate-900",
      href: `${INTERNAL_PREFIX}/frontdesk/patients`,
      cta: "Open patient records",
    },
    {
      label: "Critical / High",
      value: criticalHighCount,
      sub: `${metrics.watchCount} on watch`,
      color: criticalHighCount > 0 ? "text-red-700" : "text-emerald-700",
      href: `${INTERNAL_PREFIX}/nurses/observation`,
      cta: "Open observation board",
    },
    {
      label: "Procedure Bills Pending",
      value: pendingProcedureQueue.length,
      sub: `${money(pendingProcedureQueue.reduce((sum, procedure) => sum + procedure.amount, 0))} awaiting Accounts`,
      color: pendingProcedureQueue.length > 0 ? "text-amber-600" : "text-emerald-700",
      href: `${INTERNAL_PREFIX}/nurses/procedure-charges`,
      cta: "Open billing queue",
    },
    {
      label: "Lab Samples Pending",
      value: pendingSamples.length,
      sub: `${activeLabRequests} active lab requests`,
      color: pendingSamples.length > 0 ? "text-sky-700" : "text-emerald-700",
      href: `${INTERNAL_PREFIX}/nurses/sample-collection`,
      cta: "Open sample queue",
    },
  ];

  const units = [
    {
      key: "Outpatient",
      label: "Outpatient / Triage",
      href: `${INTERNAL_PREFIX}/nurses/triage`,
      count: metrics.outpatientCount,
      desc: "Triage, vitals, patient prep",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      key: "Ward",
      label: "Ward / Inpatient",
      href: `${INTERNAL_PREFIX}/nurses/ward`,
      count: metrics.wardCount,
      desc: "Admitted patients, bed management, meds",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      key: "Emergency",
      label: "Emergency Unit",
      href: `${INTERNAL_PREFIX}/nurses/emergency`,
      count: metrics.emergencyCount,
      desc: "Urgent triage, stabilisation support",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    },
    {
      key: "ICU",
      label: "ICU",
      href: `${INTERNAL_PREFIX}/nurses/icu`,
      count: metrics.icuCount,
      desc: "Critical care, continuous monitoring",
      icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    },
  ];

  function getPatientHref(patientId: string) {
    return patientId
      ? `${INTERNAL_PREFIX}/nurses/patients/${encodeURIComponent(patientId)}`
      : `${INTERNAL_PREFIX}/nurses`;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Nurses Bay</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Multi-unit nursing ops - Outpatient - Ward - Emergency - ICU
          </p>
        </div>
        <Link
          href={`${INTERNAL_PREFIX}/nurses/handover-notes`}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
        >
          Handover Notes -&gt;
        </Link>
      </div>

      {criticalPatients.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            <div className="flex-1 text-sm font-semibold text-red-800">
              {criticalPatients.length} critical patient{criticalPatients.length > 1 ? "s" : ""} require close monitoring:
              {" "}
              {criticalPatients.map((patient) => `${patient.patientName} (${patient.unit})`).join(", ")}
            </div>
            <Link
              href={`${INTERNAL_PREFIX}/nurses/icu`}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              Open ICU
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group block">
            <Card className="h-full p-4 transition group-hover:border-slate-300 group-hover:shadow-md sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                {stat.label}
              </p>
              <p className={`mt-1 text-2xl font-bold sm:text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{stat.sub}</p>
              <p className="mt-3 text-xs font-semibold text-accent">{stat.cta} -&gt;</p>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 sm:text-base">Nursing Units</h2>
          <Link
            href={`${INTERNAL_PREFIX}/nurses/triage`}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Open intake queue -&gt;
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {units.map((unit) => {
            const color = UNIT_COLORS[unit.key];
            const unitPatients = activePatients.filter((patient) => patient.unit === unit.key);
            const criticalCount = unitPatients.filter((patient) => patient.priority === "Critical").length;

            return (
              <Link key={unit.key} href={unit.href} className="group block">
                <Card className={`h-full border p-4 transition-all group-hover:shadow-md sm:p-5 ${color.bg} ${color.border}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${color.bg}`}>
                      <svg className={`h-5 w-5 ${color.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d={unit.icon} />
                      </svg>
                    </div>
                    {criticalCount > 0 ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {criticalCount}
                      </span>
                    ) : null}
                  </div>

                  <p className={`text-2xl font-bold ${color.text}`}>{unit.count}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{unit.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{unit.desc}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {unitPatients.slice(0, 3).map((patient) => (
                      <span
                        key={patient.id}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}
                      >
                        {patient.patientName.split(" ")[0]}
                      </span>
                    ))}
                    {unitPatients.length > 3 ? (
                      <span className="text-xs text-slate-400">+{unitPatients.length - 3}</span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs font-semibold text-accent">Open unit dashboard -&gt;</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden p-0" id="active-patients">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">All Active Patients</h3>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-xs text-slate-500">
                  {Object.entries(UNIT_COLORS).map(([unit, color]) => (
                    <span key={unit} className="flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                      {unit}
                    </span>
                  ))}
                </div>
                <Link
                  href={`${INTERNAL_PREFIX}/frontdesk/patients`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Front Desk records -&gt;
                </Link>
              </div>
            </div>

            {activePatients.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No active nursing patients yet.
                <div className="mt-2">
                  <Link href={`${INTERNAL_PREFIX}/nurses/triage`} className="font-semibold text-accent hover:underline">
                    Open triage queue -&gt;
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 px-4 py-4 md:hidden">
                  {activePatients.map((patient) => {
                    const color = UNIT_COLORS[patient.unit];
                    return (
                      <div
                        key={patient.id}
                        className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                          patient.priority === "Critical" ? "ring-1 ring-red-100" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link
                              href={getPatientHref(patient.patientId)}
                              className="text-sm font-semibold text-slate-900 hover:text-accent hover:underline"
                            >
                              {patient.patientName}
                            </Link>
                            <p className="text-xs text-slate-400">{patient.patientId}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                            {patient.priority}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <MobileMeta label="Unit" value={patient.unit} />
                          <MobileMeta label="Bed" value={patient.bed} />
                          <MobileMeta label="Nurse" value={patient.assignedNurse} />
                          <MobileMeta label="Vitals" value={fmtDateTime(patient.lastVitalsAt)} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color.bg} ${color.text}`}>
                            {patient.unit}
                          </span>
                          <Link
                            href={getPatientHref(patient.patientId)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Open record
                          </Link>
                          <Link
                            href={UNIT_ROUTES[patient.unit]}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Open unit
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Patient", "Unit", "Bed", "Diagnosis", "Nurse", "Priority", "Last Vitals", "Actions"].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePatients.map((patient) => {
                      const color = UNIT_COLORS[patient.unit];
                      return (
                        <tr key={patient.id} className={patient.priority === "Critical" ? "bg-red-50/20" : "hover:bg-slate-50"}>
                          <td className="px-4 py-3">
                            <Link href={getPatientHref(patient.patientId)} className="font-medium text-slate-900 hover:text-accent hover:underline">
                              {patient.patientName}
                            </Link>
                            <p className="text-xs text-slate-400">{patient.patientId}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color.bg} ${color.text}`}>
                              {patient.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{patient.bed}</td>
                          <td className="max-w-[220px] px-4 py-3 text-xs text-slate-600">{patient.diagnosis}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{patient.assignedNurse}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[patient.priority]}`}>
                              {patient.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(patient.lastVitalsAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={getPatientHref(patient.patientId)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                Open record
                              </Link>
                              <Link
                                href={UNIT_ROUTES[patient.unit]}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                Open unit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recent Nursing Procedures</h3>
              <div className="flex items-center gap-3">
                <Link
                  href={`${INTERNAL_PREFIX}/nurses/procedure-charges`}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Procedure charge queue
                </Link>
                <Link
                  href={`${INTERNAL_PREFIX}/nurses/procedure-charges`}
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  All charges -&gt;
                </Link>
              </div>
            </div>

            {recentProcedures.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                No nursing procedures recorded yet.
                <div className="mt-2">
                  <Link
                    href={`${INTERNAL_PREFIX}/nurses/procedure-charges`}
                    className="font-semibold text-accent hover:underline"
                  >
                    Open procedure charge queue -&gt;
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 px-4 py-4 md:hidden">
                  {recentProcedures.map((procedure) => (
                    <div key={procedure.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {procedure.patientName} - {procedure.procedureType}
                          </p>
                          <p className="text-xs text-slate-400">{procedure.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{money(procedure.amount)}</p>
                          <span
                            className={`text-xs font-semibold ${
                              procedure.billStatus === "Paid"
                                ? "text-emerald-700"
                                : procedure.billStatus === "Pending"
                                  ? "text-amber-600"
                                  : "text-sky-700"
                            }`}
                          >
                            {procedure.billStatus}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <MobileMeta label="Performed by" value={procedure.performedBy} />
                        <MobileMeta label="Time" value={fmtDateTime(procedure.performedAt)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={getPatientHref(procedure.patientId)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Open record
                        </Link>
                        <Link
                          href={`${INTERNAL_PREFIX}/nurses/procedure-charges`}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Charge queue
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden divide-y divide-slate-100 md:block">
                {recentProcedures.map((procedure) => (
                  <div key={procedure.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        procedure.billStatus === "Pending"
                          ? "bg-amber-400"
                          : procedure.billStatus === "Paid"
                            ? "bg-emerald-400"
                            : "bg-sky-400"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {procedure.patientName} - {procedure.procedureType}
                      </p>
                      <p className="text-xs text-slate-400">
                        {procedure.description} - {procedure.performedBy} - {fmtDateTime(procedure.performedAt)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-900">{money(procedure.amount)}</p>
                      <span
                        className={`text-xs font-semibold ${
                          procedure.billStatus === "Paid"
                            ? "text-emerald-700"
                            : procedure.billStatus === "Pending"
                              ? "text-amber-600"
                              : "text-sky-700"
                        }`}
                      >
                        {procedure.billStatus}
                      </span>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={getPatientHref(procedure.patientId)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Open record
                      </Link>
                      <Link
                        href={`${INTERNAL_PREFIX}/nurses/procedure-charges`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Charge queue
                      </Link>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 font-bold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Outpatient / Triage", sub: `${metrics.outpatientCount} active in intake`, href: `${INTERNAL_PREFIX}/nurses/triage`, dot: "bg-sky-400" },
                { label: "Ward / Inpatient", sub: `${metrics.wardCount} admitted patients`, href: `${INTERNAL_PREFIX}/nurses/ward`, dot: "bg-emerald-500" },
                { label: "Emergency Unit", sub: `${metrics.emergencyCount} active emergency cases`, href: `${INTERNAL_PREFIX}/nurses/emergency`, dot: "bg-amber-500" },
                { label: "ICU", sub: `${metrics.icuCount} critical care patients`, href: `${INTERNAL_PREFIX}/nurses/icu`, dot: "bg-red-500" },
                { label: "Medication Administration", sub: `${metrics.wardCount + metrics.icuCount + metrics.emergencyCount} inpatient medication queue`, href: `${INTERNAL_PREFIX}/nurses/medication-administration`, dot: "bg-violet-400" },
                { label: "Sample Collection", sub: `${pendingSamples.length} ordered samples waiting`, href: `${INTERNAL_PREFIX}/nurses/sample-collection`, dot: "bg-sky-400" },
                { label: "Procedure Charges", sub: `${pendingProcedureQueue.length} to send, ${accountsBillingQueue} with Accounts`, href: `${INTERNAL_PREFIX}/nurses/procedure-charges`, dot: "bg-slate-400" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${action.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                    <p className="text-xs text-slate-400">{action.sub}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-bold text-slate-900">Patient Context</h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Cross-department dashboards are intentionally not linked from Nurses.
              Open any patient record from <strong>All Active Patients</strong> to view the safe nurse-side summary for:
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {[
                { label: "Doctors", sub: "Assigned doctor, visit history, care context" },
                { label: "Pharmacy", sub: "Prescriptions, medication requests, MAR summary" },
                { label: "Lab", sub: "Test requests and sample workflow for that patient" },
                { label: "Accounts", sub: "Nursing charge status and billing snapshot only" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    In patient record
                  </span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
