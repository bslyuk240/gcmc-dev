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

export default function AdminNursesMonitorPage() {
  const { allPatients, metrics, procedures } = useNursesStore();
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

      <div className="flex gap-3">
        {[
          { label: "Total Active", value: metrics.totalActive, color: "text-slate-900" },
          { label: "Ward", value: metrics.wardCount, color: "text-emerald-700" },
          { label: "Emergency", value: metrics.emergencyCount, color: "text-amber-600" },
          { label: "ICU Critical", value: metrics.icuCount, color: "text-red-700" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">All Active Nursing Patients</h3>
            </div>
            <div className="overflow-x-auto">
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
