"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";

const UNIT_COLORS: Record<string, { bg: string; text: string }> = {
  Outpatient: { bg: "bg-sky-50", text: "text-sky-700" },
  Ward:       { bg: "bg-emerald-50", text: "text-emerald-700" },
  Emergency:  { bg: "bg-amber-50", text: "text-amber-700" },
  ICU:        { bg: "bg-red-50", text: "text-red-700" },
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-50 text-emerald-700",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function AdminNursesMonitorPage() {
  const { allPatients, metrics } = useNursesStore();
  const activePatients = allPatients.filter((p) => p.status === "Active");
  const critical = activePatients.filter((p) => p.priority === "Critical");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Nurses Bay Monitor" description="Nursing unit oversight — Ward, Emergency, ICU and Outpatient activity, care quality, and procedure billing." />
      </div>

      {critical.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            {critical.length} critical patient{critical.length > 1 ? "s" : ""} active: {critical.map((p) => `${p.patientName} (${p.unit})`).join(", ")}
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Active", value: metrics.totalActive, color: "text-slate-900" },
          { label: "Ward", value: metrics.wardCount, color: "text-emerald-700" },
          { label: "Emergency", value: metrics.emergencyCount, color: "text-amber-600" },
          { label: "ICU Critical", value: metrics.icuCount, color: "text-red-700" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">All Active Nursing Patients</h3>
            </div>
            <div className="space-y-3 p-4 md:hidden">
              {activePatients.map((p) => {
                return (
                  <Card key={p.id} className={`p-4 ${p.priority === "Critical" ? "border-red-200 bg-red-50/30" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{p.patientName}</p>
                        <p className="text-xs text-slate-400">{p.patientId}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <MobileMeta label="Unit" value={p.unit} />
                      <MobileMeta label="Bed" value={p.bed} />
                      <MobileMeta label="Diagnosis" value={p.diagnosis} />
                      <MobileMeta label="Nurse" value={p.assignedNurse} />
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0 last:pb-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Priority</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {activePatients.length === 0 && (
                <Card className="p-6 text-center text-sm text-slate-400">No active nursing patients.</Card>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Unit", "Bed", "Diagnosis", "Nurse", "Priority"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePatients.map((p) => {
                    const col = UNIT_COLORS[p.unit];
                    return (
                      <tr key={p.id} className={`hover:bg-slate-50 ${p.priority === "Critical" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{p.patientName}</p>
                          <p className="text-xs text-slate-400">{p.patientId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${col?.bg} ${col?.text}`}>{p.unit}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{p.bed}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[160px] truncate">{p.diagnosis}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.assignedNurse}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {activePatients.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">No active nursing patients.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Unit summary */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Unit Summary</h3>
            <div className="space-y-3">
              {(["Outpatient", "Ward", "Emergency", "ICU"] as const).map((unit) => {
                const count = activePatients.filter((p) => p.unit === unit).length;
                const critCount = activePatients.filter((p) => p.unit === unit && p.priority === "Critical").length;
                const col = UNIT_COLORS[unit];
                return (
                  <div key={unit} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${col.bg.replace("bg-", "bg-").replace("50", "400")}`} />
                      <span className={`text-xs font-semibold ${col.text}`}>{unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{count} patients</span>
                      {critCount > 0 && <span className="text-xs font-bold text-red-600">{critCount} critical</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Procedure Charges</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Pending bills</span><span className="font-bold text-amber-600">{metrics.pendingProcedureBills}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Value pending</span><span className="font-bold text-slate-800">₦{metrics.procedureBillValue}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
