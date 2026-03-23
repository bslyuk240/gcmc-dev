"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

function fmtRxTime(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const PRIORITY_STYLES: Record<string, string> = {
  Urgent: "bg-red-50 text-red-700",
  Routine: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700",
  Processing: "bg-sky-50 text-sky-700",
  Dispensed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-slate-100 text-slate-500",
};

export default function PharmacyDashboardPage() {
  const { prescriptions, nurseRequests, restockRequests, bills, metrics } = usePharmacyStore();

  const recentRx = prescriptions
    .filter((rx) => rx.status === "Pending" || rx.status === "Processing")
    .slice(0, 5);
  const lowStockItems = restockRequests.filter((r) => r.status === "Pending").slice(0, 4);
  const urgentCount = prescriptions.filter(
    (p) => p.urgency === "Urgent" && p.status !== "Dispensed" && p.status !== "Cancelled",
  ).length;

  const pendingBillTotal = bills
    .filter((b) => b.billStatus === "Pending")
    .reduce((s, b) => s + b.totalCost, 0);

  const kpis = [
    {
      label: "Prescriptions Pending",
      value: String(metrics.pendingPrescriptions),
      sub: urgentCount > 0 ? `${urgentCount} urgent` : "All routine",
      up: false,
      color: urgentCount > 0 ? "text-red-600" : "text-amber-600",
    },
    {
      label: "Dispensed Today",
      value: String(metrics.dispensedToday),
      sub: "Completed",
      up: metrics.dispensedToday > 0,
      color: "text-emerald-600",
    },
    {
      label: "Pending Bills",
      value: `₦${pendingBillTotal.toLocaleString()}`,
      sub: `${metrics.pendingBills} awaiting payment`,
      up: false,
      color: "text-slate-900",
    },
    {
      label: "Nurse Requests",
      value: String(nurseRequests.filter((r) => r.status !== "Collected" && r.status !== "Cancelled").length),
      sub: `${metrics.nurseReadyRequests} ready to collect`,
      up: false,
      color: "text-violet-600",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Pharmacy Dashboard"
        description="Prescription queue, dispensing activity, and stock alerts."
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{k.label}</p>
            <p className={`mt-1 text-lg font-bold sm:text-2xl ${k.color}`}>{k.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${k.up ? "text-emerald-600" : "text-slate-500"}`}>
              {k.up && (
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {k.sub}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Prescription Queue */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Prescription Queue</h3>
              <Link href={`${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`} className="text-sm font-semibold text-accent hover:underline">
                Full queue →
              </Link>
            </div>
            {recentRx.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No prescriptions yet today.</p>
            ) : (
              <>
                <div className="space-y-3 px-4 py-4 md:hidden">
                  {recentRx.map((rx) => (
                    <div key={rx.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{rx.patientName}</p>
                          <p className="text-xs text-slate-500">{rx.doctorName}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[rx.status]}`}>
                          {rx.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <MobileMeta label="Ref" value={rx.id} />
                        <MobileMeta label="Drugs" value={rx.drugs.map((d) => d.name).join(", ")} />
                        <MobileMeta label="Time" value={fmtRxTime(rx.createdAt)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[rx.urgency]}`}>
                          {rx.urgency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["Ref", "Patient", "Doctor", "Drug(s)", "Time", "Priority", "Status"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRx.map((rx) => (
                      <tr key={rx.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{rx.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{rx.patientName}</td>
                        <td className="px-4 py-3 text-slate-500">{rx.doctorName}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate text-xs">
                          {rx.drugs.map((d) => d.name).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{fmtRxTime(rx.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[rx.urgency]}`}>
                            {rx.urgency}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[rx.status]}`}>
                            {rx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>

          {/* Nurse Requests */}
          {nurseRequests.filter((r) => r.status !== "Collected" && r.status !== "Cancelled").length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Nurse Medication Requests</h3>
                <Link href={`${INTERNAL_PREFIX}/pharmacy/nurse-requests`} className="text-sm font-semibold text-accent hover:underline">
                  Manage →
                </Link>
              </div>
              <div className="divide-y divide-slate-100">
                {nurseRequests
                  .filter((r) => r.status !== "Collected" && r.status !== "Cancelled")
                  .slice(0, 4)
                  .map((req) => (
                    <div key={req.id} className="flex items-center gap-4 px-5 py-3">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${req.urgency === "STAT" ? "bg-red-500 animate-pulse" : req.urgency === "Urgent" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{req.drug} — {req.patientName}</p>
                        <p className="text-xs text-slate-400">{req.ward} · {req.requestedBy}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        req.status === "Ready" ? "bg-emerald-100 text-emerald-700"
                        : req.status === "Preparing" ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Low stock alerts */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Low Stock / Restock Requests</h3>
              <Link href={`${INTERNAL_PREFIX}/pharmacy/restock-requests`} className="text-sm font-semibold text-accent hover:underline">
                View all →
              </Link>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400 italic">All stock levels are adequate.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${item.urgency === "Critical" ? "bg-red-500 animate-pulse" : item.urgency === "Urgent" ? "bg-amber-500" : "bg-slate-400"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{item.drug}</p>
                      <p className="text-xs text-slate-400">Qty: {item.currentStock} · Reorder at {item.reorderLevel}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.urgency === "Critical" ? "bg-red-100 text-red-700"
                      : item.urgency === "Urgent" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>
                      {item.urgency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Pending Rx", href: `${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`, color: "text-amber-600" },
                { label: "Inventory", href: `${INTERNAL_PREFIX}/pharmacy/inventory`, color: "text-slate-700" },
                { label: "Restock", href: `${INTERNAL_PREFIX}/pharmacy/restock-requests`, color: "text-blue-600" },
                { label: "Movements", href: `${INTERNAL_PREFIX}/pharmacy/stock-movements`, color: "text-violet-600" },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Today's Summary */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Today&apos;s Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                { label: "Total prescriptions", value: String(prescriptions.length) },
                { label: "Dispensed", value: String(metrics.dispensedToday) },
                { label: "Pending / Processing", value: String(metrics.pendingPrescriptions) },
                { label: "Nurse requests", value: String(nurseRequests.length) },
                { label: "Pending bills", value: `₦${pendingBillTotal.toLocaleString()}` },
              ].map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-bold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Bills status */}
          {bills.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-slate-900">Recent Bills</h3>
              <div className="mt-3 space-y-2.5">
                {bills.slice(0, 4).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-slate-800 truncate">{b.patientName}</p>
                      <p className="text-xs text-slate-400 truncate">{b.drugs.slice(0, 40)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-slate-900">₦{b.totalCost.toFixed(0)}</p>
                      <span className={`text-xs font-semibold ${b.billStatus === "Paid" ? "text-emerald-600" : b.billStatus === "Waived" ? "text-slate-400" : "text-amber-600"}`}>
                        {b.billStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
