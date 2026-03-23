"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useLabStore } from "@/lib/hooks/use-lab-store";

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  "Sample Collected": "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function LabDashboardPage() {
  const { tests, metrics } = useLabStore();

  const urgentTests = tests.filter((t) => t.priority !== "Routine" && t.status !== "Completed" && t.status !== "Cancelled");
  const recentCompleted = tests.filter((t) => t.status === "Completed").slice(0, 4);
  const pendingTests = tests.filter((t) => t.status === "Pending").slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Lab Dashboard</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Diagnostic tests, sample processing, and results management</p>
        </div>
        <Link href={`${INTERNAL_PREFIX}/lab/test-requests`}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm">
          View All →
        </Link>
      </div>

      {/* Alert: STAT/Urgent tests */}
      {urgentTests.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-red-800">
            {urgentTests.filter((t) => t.priority === "STAT").length > 0 &&
              `${urgentTests.filter((t) => t.priority === "STAT").length} STAT test(s) — immediate attention required. `}
            {urgentTests.filter((t) => t.priority === "Urgent").length > 0 &&
              `${urgentTests.filter((t) => t.priority === "Urgent").length} Urgent test(s) pending.`}
          </span>
          <Link href={`${INTERNAL_PREFIX}/lab/test-requests`} className="ml-auto text-xs font-bold text-red-700 underline">
            Open queue →
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {[
          { label: "Pending Tests", value: metrics.pendingTests, sub: "Awaiting sample", color: "text-amber-600", bg: "bg-amber-50", href: `${INTERNAL_PREFIX}/lab/test-requests` },
          { label: "Sample Collected", value: metrics.sampleCollectedTests, sub: "Awaiting processing", color: "text-sky-700", bg: "bg-sky-50", href: `${INTERNAL_PREFIX}/lab/sample-collection` },
          { label: "In Progress", value: metrics.inProgressTests, sub: "Being processed", color: "text-violet-700", bg: "bg-violet-50", href: `${INTERNAL_PREFIX}/lab/processing` },
          { label: "Completed Today", value: metrics.completedTests, sub: "Results available", color: "text-emerald-700", bg: "bg-emerald-50", href: `${INTERNAL_PREFIX}/lab/results` },
          { label: "Urgent / STAT", value: metrics.urgentTests, sub: "Requires priority", color: metrics.urgentTests > 0 ? "text-red-700" : "text-slate-600", bg: metrics.urgentTests > 0 ? "bg-red-50" : "bg-slate-50", href: `${INTERNAL_PREFIX}/lab/test-requests` },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="col-span-1">
            <Card className={`p-4 sm:p-5 ${s.bg} border-0 cursor-pointer hover:shadow-md transition-shadow h-full`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold sm:text-3xl ${s.color}`}>{s.value}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">{s.sub}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Tests Queue */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-slate-900">Tests Awaiting Action</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pending and sample-collected tests that need processing</p>
              </div>
              <Link href={`${INTERNAL_PREFIX}/lab/test-requests`} className="text-sm font-semibold text-accent hover:underline">
                Full queue →
              </Link>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {pendingTests.map((t) => (
                <Card key={t.id} className={`p-4 ${t.priority === "STAT" ? "border-red-200 bg-red-50/40" : t.priority === "Urgent" ? "bg-amber-50/30" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.patientName}</p>
                      <p className="text-xs text-slate-400">{t.patientId}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <MobileMeta label="Test" value={t.testName} />
                    <MobileMeta label="Category" value={t.category} />
                    <MobileMeta label="Ordered By" value={t.orderedBy} />
                    <MobileMeta label="Status" value={t.status} />
                  </div>
                </Card>
              ))}
              {pendingTests.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-slate-400">No pending tests at the moment.</p>
              )}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Patient", "Test", "Ordered By", "Priority", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingTests.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{t.patientName}</p>
                        <p className="text-xs text-slate-400">{t.patientId}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{t.testName}</p>
                        <p className="text-xs text-slate-400">{t.category}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{t.orderedBy}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                  {pendingTests.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No pending tests at the moment.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recently Completed */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recently Completed</h3>
              <Link href={`${INTERNAL_PREFIX}/lab/results`} className="text-sm font-semibold text-accent hover:underline">All results →</Link>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {recentCompleted.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.patientName}</p>
                      <p className="text-xs text-slate-400">{t.testName}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      t.interpretation === "Critical" ? "bg-red-50 text-red-700"
                      : t.interpretation === "Abnormal" ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                    }`}>{t.interpretation ?? "Normal"}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <MobileMeta label="Ordered By" value={t.orderedBy} />
                    <MobileMeta label="Completed" value={t.completedAt ?? "—"} />
                  </div>
                </Card>
              ))}
              {recentCompleted.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-slate-400">No completed tests yet today.</p>
              )}
            </div>
            <div className="hidden divide-y divide-slate-100 md:block">
              {recentCompleted.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${t.interpretation === "Critical" ? "bg-red-500" : t.interpretation === "Abnormal" ? "bg-amber-400" : "bg-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm">{t.patientName} — {t.testName}</p>
                    <p className="text-xs text-slate-400">{t.orderedBy} · {t.completedAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      t.interpretation === "Critical" ? "bg-red-50 text-red-700"
                      : t.interpretation === "Abnormal" ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                    }`}>{t.interpretation ?? "Normal"}</span>
                  </div>
                </div>
              ))}
              {recentCompleted.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No completed tests yet today.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick links */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Test Requests", desc: "View all ordered tests", href: `${INTERNAL_PREFIX}/lab/test-requests` },
                { label: "Sample Collection", desc: "Record collected samples", href: `${INTERNAL_PREFIX}/lab/sample-collection` },
                { label: "Lab Processing", desc: "Process tests in queue", href: `${INTERNAL_PREFIX}/lab/processing` },
                { label: "Enter Results", desc: "Input test result values", href: `${INTERNAL_PREFIX}/lab/results-entry` },
                { label: "View Results", desc: "Browse completed results", href: `${INTERNAL_PREFIX}/lab/results` },
                { label: "Test Catalog", desc: "Available tests and prices", href: `${INTERNAL_PREFIX}/lab/test-catalog` },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 hover:border-slate-300 hover:bg-slate-50 transition">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.label}</p>
                    <p className="text-xs text-slate-400">{a.desc}</p>
                  </div>
                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </Card>

          {/* Today's summary */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Today&apos;s Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Tests</span>
                <span className="font-bold text-slate-900">{metrics.totalToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Avg Turnaround</span>
                <span className="font-semibold text-slate-800">{metrics.avgTurnaround}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue Today</span>
                <span className="font-bold text-emerald-700">₦{metrics.revenueToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending Bills</span>
                <span className={`font-semibold ${metrics.pendingBillCount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {metrics.pendingBillCount} (₦{metrics.pendingBillValue})
                </span>
              </div>
            </div>

            {/* Workload bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Workload</span>
                <span>{metrics.inProgressTests + metrics.sampleCollectedTests}/{metrics.totalToday}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-accent"
                  style={{ width: `${metrics.totalToday ? Math.round(((metrics.completedTests) / metrics.totalToday) * 100) : 0}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {metrics.totalToday ? Math.round((metrics.completedTests / metrics.totalToday) * 100) : 0}% of today&apos;s tests completed
              </p>
            </div>
          </Card>

          {/* Category breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Tests by Category</h3>
            {(() => {
              const cats = tests.reduce((acc, t) => {
                acc[t.category] = (acc[t.category] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              return Object.entries(cats).map(([cat, count]) => (
                <div key={cat} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / tests.length) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}
