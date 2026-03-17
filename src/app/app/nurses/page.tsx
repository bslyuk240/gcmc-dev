"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";

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

export default function NursesDashboardPage() {
  const { allPatients, metrics, procedures } = useNursesStore();

  const criticalPatients = allPatients.filter((p) => p.priority === "Critical" && p.status === "Active");
  const recentProcedures = procedures.slice(0, 5);

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

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Nurses Bay</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Multi-unit nursing ops — Outpatient · Ward · Emergency · ICU</p>
        </div>
        <Link href={`${INTERNAL_PREFIX}/nurses/handover-notes`}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm">
          Handover →
        </Link>
      </div>

      {/* Critical alert */}
      {criticalPatients.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <div className="flex-1 text-sm font-semibold text-red-800">
            {criticalPatients.length} critical patient{criticalPatients.length > 1 ? "s" : ""} require close monitoring:
            {" "}{criticalPatients.map((p) => `${p.patientName} (${p.unit})`).join(", ")}
          </div>
        </div>
      )}

      {/* Top-level stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: "Total Active Patients", value: metrics.totalActive, sub: "Across all units", color: "text-slate-900" },
          { label: "Critical / High", value: metrics.criticalCount, sub: `${metrics.watchCount} on watch`, color: metrics.criticalCount > 0 ? "text-red-700" : "text-emerald-700" },
          { label: "Procedure Bills Pending", value: metrics.pendingProcedureBills, sub: `₦${metrics.procedureBillValue} to Accounts`, color: metrics.pendingProcedureBills > 0 ? "text-amber-600" : "text-emerald-700" },
          { label: "Lab Samples Pending", value: metrics.samplesPending, sub: "Ordered, not collected", color: metrics.samplesPending > 0 ? "text-sky-700" : "text-emerald-700" },
        ].map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Unit cards */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900 sm:text-base">Nursing Units</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {units.map((unit) => {
            const col = UNIT_COLORS[unit.key];
            const unitPatients = allPatients.filter((p) => p.unit === unit.key && p.status === "Active");
            const critCount = unitPatients.filter((p) => p.priority === "Critical").length;
            return (
              <Link key={unit.key} href={unit.href}>
                <Card className={`p-4 sm:p-5 ${col.bg} border ${col.border} cursor-pointer hover:shadow-md transition-all h-full`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${col.bg}`}>
                      <svg className={`h-5 w-5 ${col.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" d={unit.icon} />
                      </svg>
                    </div>
                    {critCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{critCount}</span>
                    )}
                  </div>
                  <p className={`text-2xl font-bold ${col.text}`}>{unit.count}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{unit.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{unit.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {unitPatients.slice(0, 3).map((p) => (
                      <span key={p.id} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>
                        {p.patientName.split(" ")[0]}
                      </span>
                    ))}
                    {unitPatients.length > 3 && <span className="text-xs text-slate-400">+{unitPatients.length - 3}</span>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* All active patients */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">All Active Patients</h3>
              <div className="flex gap-2 text-xs text-slate-500">
                {Object.entries(UNIT_COLORS).map(([u, c]) => (
                  <span key={u} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />{u}
                  </span>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Unit", "Bed", "Diagnosis", "Nurse", "Priority", "Last Vitals"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPatients.filter((p) => p.status === "Active").map((p) => {
                    const col = UNIT_COLORS[p.unit];
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 ${p.priority === "Critical" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{p.patientName}</p>
                          <p className="text-xs text-slate-400">{p.patientId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${col.bg} ${col.text}`}>{p.unit}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{p.bed}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{p.diagnosis}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.assignedNurse}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{p.lastVitalsAt ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent procedures */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recent Nursing Procedures</h3>
              <Link href={`${INTERNAL_PREFIX}/nurses/procedure-charges`} className="text-sm font-semibold text-accent hover:underline">
                All charges →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentProcedures.map((proc) => (
                <div key={proc.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${proc.billStatus === "Pending" ? "bg-amber-400" : proc.billStatus === "Paid" ? "bg-emerald-400" : "bg-sky-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{proc.patientName} — {proc.procedureType}</p>
                    <p className="text-xs text-slate-400">{proc.description} · {proc.performedBy}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">₦{proc.amount}</p>
                    <span className={`text-xs font-semibold ${proc.billStatus === "Paid" ? "text-emerald-700" : proc.billStatus === "Pending" ? "text-amber-600" : "text-sky-700"}`}>{proc.billStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick navigation */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Outpatient / Triage", sub: "Vitals and patient prep", href: `${INTERNAL_PREFIX}/nurses/triage`, dot: "bg-sky-400" },
                { label: "Ward / Inpatient", sub: `${metrics.wardCount} patients`, href: `${INTERNAL_PREFIX}/nurses/ward`, dot: "bg-emerald-500" },
                { label: "Emergency Unit", sub: `${metrics.emergencyCount} active`, href: `${INTERNAL_PREFIX}/nurses/emergency`, dot: "bg-amber-500" },
                { label: "ICU", sub: `${metrics.icuCount} critical`, href: `${INTERNAL_PREFIX}/nurses/icu`, dot: "bg-red-500" },
                { label: "Medication Administration", sub: "MAR and pharmacy requests", href: `${INTERNAL_PREFIX}/nurses/medication-administration`, dot: "bg-violet-400" },
                { label: "Sample Collection", sub: "Lab samples for patients", href: `${INTERNAL_PREFIX}/nurses/sample-collection`, dot: "bg-sky-400" },
                { label: "Procedure Charges", sub: "Send bills to Accounts", href: `${INTERNAL_PREFIX}/nurses/procedure-charges`, dot: "bg-slate-400" },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50 transition">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${a.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.sub}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </Card>

          {/* Departmental links */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Department Links</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Doctors — Consultations", href: `${INTERNAL_PREFIX}/doctors/consultations`, sub: "View care instructions" },
                { label: "Pharmacy — Medications", href: `${INTERNAL_PREFIX}/pharmacy/inventory`, sub: "Check drug availability" },
                { label: "Lab — Pending Tests", href: `${INTERNAL_PREFIX}/lab/test-requests`, sub: "Track ordered lab tests" },
              ].map((link) => (
                <Link key={link.label} href={link.href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 transition">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{link.label}</p>
                    <p className="text-xs text-slate-400">{link.sub}</p>
                  </div>
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
