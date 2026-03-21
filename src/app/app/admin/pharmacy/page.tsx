"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

export default function AdminPharmacyMonitorPage() {
  const { metrics, prescriptions, restockRequests } = usePharmacyStore();
  const dispensedToday = prescriptions.filter((p) => p.status === "Dispensed");
  const pendingRx = prescriptions.filter((p) => p.status === "Pending" || p.status === "Processing");
  const urgentDrugs = restockRequests.filter((r) => r.status === "Pending");
  const criticalDrugs = restockRequests.filter((r) => r.status === "Pending" && r.urgency === "Critical");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Pharmacy Monitor" description="Medication dispensing, prescription queue, stock levels, and expiry alerts." />
      </div>

      {criticalDrugs.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            {criticalDrugs.length} critical stock alert{criticalDrugs.length > 1 ? "s" : ""}: {criticalDrugs.map((d) => d.drug).join(", ")}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {[
          { label: "Pending Rx", value: metrics.pendingPrescriptions, color: metrics.pendingPrescriptions > 5 ? "text-amber-600" : "text-slate-900" },
          { label: "Dispensed Today", value: dispensedToday.length, color: "text-emerald-700" },
          { label: "Unpaid Bills", value: metrics.pendingBills, color: metrics.pendingBills > 0 ? "text-violet-700" : "text-slate-900" },
          { label: "Stock Alerts", value: urgentDrugs.length, color: urgentDrugs.length > 0 ? "text-red-700" : "text-emerald-700" },
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
              <h3 className="font-bold text-slate-900">Recent Prescriptions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Prescribed By", "Drugs", "Urgency", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptions.slice(0, 8).map((rx) => (
                    <tr key={rx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{rx.patientName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{rx.doctorName}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{rx.drugs.map((d) => d.name).join(", ")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rx.urgency === "Urgent" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{rx.urgency}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rx.status === "Dispensed" ? "bg-emerald-50 text-emerald-700" : rx.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>{rx.status}</span>
                      </td>
                    </tr>
                  ))}
                  {prescriptions.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No prescriptions.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          {urgentDrugs.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Stock Alerts — Action Required</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {urgentDrugs.map((r) => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${r.urgency === "Critical" ? "bg-red-500" : "bg-amber-400"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{r.drug}</p>
                      <p className="text-xs text-slate-400">{r.currentStock} units remaining · Reorder at {r.reorderLevel}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.urgency === "Critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{r.urgency}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Key Metrics</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Nurse Requests Ready", value: metrics.nurseReadyRequests, color: metrics.nurseReadyRequests > 0 ? "text-sky-700" : "text-slate-500" },
                { label: "Urgent Rx", value: metrics.urgentPrescriptions, color: metrics.urgentPrescriptions > 0 ? "text-red-600" : "text-slate-500" },
                { label: "Pending Restock", value: metrics.pendingRestocks, color: metrics.pendingRestocks > 0 ? "text-amber-600" : "text-slate-500" },
                { label: "Bill Value Pending", value: `₦${metrics.pendingBillValue}`, color: "text-violet-700" },
              ].map((m) => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-slate-500">{m.label}</span>
                  <span className={`font-bold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
