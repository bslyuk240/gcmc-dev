"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useLabStore } from "@/lib/hooks/use-lab-store";

export default function AdminLabMonitorPage() {
  const { tests, metrics } = useLabStore();
  const active = tests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const completed = tests.filter((t) => t.status === "Completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Laboratory Monitor" description="Diagnostic test pipeline, result turnaround, urgent STAT tests, and lab revenue." />
      </div>

      {metrics.urgentTests > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-amber-800">{metrics.urgentTests} urgent/STAT tests in pipeline — monitor turnaround time.</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pending Tests", value: metrics.pendingTests, color: metrics.pendingTests > 5 ? "text-amber-600" : "text-slate-900" },
          { label: "In Progress", value: metrics.inProgressTests, color: "text-violet-700" },
          { label: "Completed Today", value: completed.length, color: "text-emerald-700" },
          { label: "Urgent / STAT", value: metrics.urgentTests, color: metrics.urgentTests > 0 ? "text-red-700" : "text-slate-500" },
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
              <h3 className="font-bold text-slate-900">Active Test Pipeline</h3>
            </div>
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {active.slice(0, 8).map((t) => (
                  <Card key={t.id} className={`p-4 ${t.priority === "STAT" ? "border-red-200 bg-red-50/20" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{t.patientName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{t.testName}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "In Progress" ? "bg-violet-50 text-violet-700" : t.status === "Sample Collected" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{t.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ordered By</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{t.orderedBy}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Priority</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{t.priority}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {active.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-400">No active tests.</div>}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Patient", "Test", "Ordered By", "Priority", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {active.slice(0, 8).map((t) => (
                      <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{t.patientName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{t.testName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.orderedBy}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.priority === "STAT" ? "bg-red-100 text-red-700" : t.priority === "Urgent" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === "In Progress" ? "bg-violet-50 text-violet-700" : t.status === "Sample Collected" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                    {active.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No active tests.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recent Results</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {completed.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{t.patientName} — {t.testName}</p>
                    <p className="text-xs text-slate-400">Ordered by {t.orderedBy} · {t.orderedAt}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.interpretation === "Critical" ? "bg-red-50 text-red-700" : t.interpretation === "Abnormal" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {t.interpretation ?? "Normal"}
                  </span>
                </div>
              ))}
              {completed.length === 0 && <div className="px-5 py-6 text-center text-sm text-slate-400">No completed tests yet.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Lab Revenue</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Avg Turnaround</span><span className="font-bold text-slate-800">{metrics.avgTurnaround}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Completed Tests</span><span className="font-bold text-emerald-700">{metrics.completedTests}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sample Collected</span><span className="font-bold text-sky-700">{metrics.sampleCollectedTests}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cancelled</span><span className="font-bold text-slate-500">{tests.filter((t) => t.status === "Cancelled").length}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
