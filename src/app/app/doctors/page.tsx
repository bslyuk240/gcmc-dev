"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";
import { useLabStore } from "@/lib/hooks/use-lab-store";
import { useAccountsStore } from "@/lib/hooks/use-accounts-store";
import { useNursesStore } from "@/lib/hooks/use-nurses-store";

const STATUS_STYLES: Record<string, string> = {
  "In Progress": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  "Awaiting Results": "bg-amber-50 text-amber-700",
  Admitted: "bg-red-50 text-red-700",
};

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700 font-bold",
  High: "bg-amber-50 text-amber-700",
  Watch: "bg-amber-50 text-amber-600",
  Stable: "bg-emerald-50 text-emerald-700",
};

export default function DoctorsDashboardPage() {
  const { consultations, doctors, admissionOrders, metrics } = useDoctorsStore();
  const { prescriptions } = usePharmacyStore();
  const { tests } = useLabStore();
  const { metrics: accMetrics } = useAccountsStore();
  const { allPatients: nursePatients } = useNursesStore();

  const todayConsults = consultations.filter((c) => c.date === "Mar 15, 2026");
  const activeConsults = todayConsults.filter((c) => c.status === "In Progress" || c.status === "Awaiting Results");
  const myPrescriptions = prescriptions.slice(0, 3);
  const pendingLabOrders = tests.filter((t) => t.status !== "Completed" && t.status !== "Cancelled");
  const admittedByDoctors = nursePatients.filter((p) => p.status === "Active" && (p.unit === "Ward" || p.unit === "ICU"));
  const onDutyDoctors = doctors.filter((d) => d.status === "On Duty");

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Doctors Dashboard"
        description="Clinical overview — consultations, lab orders, prescriptions, and admitted patients."
      />

      {/* Alerts */}
      {metrics.awaitingResults > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-amber-800">
            {metrics.awaitingResults} consultation{metrics.awaitingResults > 1 ? "s" : ""} awaiting lab results — review when ready.
          </span>
          <Link href={`${INTERNAL_PREFIX}/doctors/lab-results`} className="ml-auto text-xs font-bold text-amber-700 hover:underline whitespace-nowrap">
            View Results →
          </Link>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
        {[
          { label: "Consultations Today", value: metrics.consultationsToday, color: "text-slate-900" },
          { label: "Active Now", value: metrics.inProgress, color: "text-violet-700" },
          { label: "Awaiting Results", value: metrics.awaitingResults, color: metrics.awaitingResults > 0 ? "text-amber-600" : "text-slate-400" },
          { label: "Rx Written Today", value: metrics.rxWrittenToday, color: "text-emerald-700" },
        ].map((k) => (
          <Card key={k.label} className="flex flex-1 items-center gap-2.5 px-3 py-3 sm:px-4">
            <p className={`text-xl font-bold shrink-0 sm:text-2xl ${k.color}`}>{k.value}</p>
            <p className="text-[10px] font-semibold leading-tight text-slate-500 sm:text-xs">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Today's consultations */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Today&apos;s Consultations</h3>
              <Link href={`${INTERNAL_PREFIX}/doctors/consultations`} className="text-sm font-semibold text-blue-600 hover:underline">Open all →</Link>
            </div>
            <div className="divide-y divide-slate-100">
              {todayConsults.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                    {c.patientName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900">{c.patientName}</p>
                      <span className="text-xs text-slate-400">{c.patientId}</span>
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{c.consultType}</span>
                    </div>
                    <p className="text-xs text-slate-500">{c.doctorName} · {c.time}</p>
                    {c.chiefComplaint && <p className="text-xs text-slate-400 truncate max-w-xs">{c.chiefComplaint}</p>}
                    <div className="flex gap-2 mt-0.5">
                      {c.rxWritten && <span className="text-[10px] font-bold text-sky-700 bg-sky-50 rounded px-1.5 py-0.5">Rx</span>}
                      {c.labOrdered && <span className="text-[10px] font-bold text-violet-700 bg-violet-50 rounded px-1.5 py-0.5">Lab</span>}
                      {c.admissionOrdered && <span className="text-[10px] font-bold text-red-700 bg-red-50 rounded px-1.5 py-0.5">Admitted</span>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                </div>
              ))}
              {todayConsults.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-slate-400">No consultations today yet.</p>
              )}
            </div>
          </Card>

          {/* Pending lab orders */}
          {pendingLabOrders.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-slate-900">Pending Lab Orders</h3>
                <Link href={`${INTERNAL_PREFIX}/doctors/lab-orders`} className="text-sm font-semibold text-blue-600 hover:underline">View all →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Patient", "Test", "Priority", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLabOrders.slice(0, 5).map((t) => (
                      <tr key={t.id} className={`hover:bg-slate-50 ${t.priority === "STAT" ? "bg-red-50/20" : ""}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">{t.patientName}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{t.testName}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.priority === "STAT" ? "bg-red-100 text-red-700" : t.priority === "Urgent" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "In Progress" ? "bg-violet-50 text-violet-700" : t.status === "Sample Collected" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Start Consult", href: `${INTERNAL_PREFIX}/doctors/consultations` },
                { label: "Queue", href: `${INTERNAL_PREFIX}/doctors/queue` },
                { label: "Lab Orders", href: `${INTERNAL_PREFIX}/doctors/lab-orders` },
                { label: "Lab Results", href: `${INTERNAL_PREFIX}/doctors/lab-results` },
                { label: "Prescriptions", href: `${INTERNAL_PREFIX}/doctors/prescriptions` },
                { label: "Admitted", href: `${INTERNAL_PREFIX}/doctors/admitted-patients` },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Doctors on duty */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Doctors On Duty</h3>
            <div className="space-y-2.5">
              {onDutyDoctors.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                    {d.name.split(" ").slice(-1)[0].charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{d.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{d.specialty}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 shrink-0">{d.consultationsToday}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Admitted patients */}
          {admittedByDoctors.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">Admitted Patients</h3>
                <Link href={`${INTERNAL_PREFIX}/doctors/admitted-patients`} className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {admittedByDoctors.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="font-semibold text-slate-900">{p.patientName}</p>
                      <p className="text-slate-400">{p.unit} · {p.bed}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[p.priority]}`}>{p.priority}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Billing summary */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Billing Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Fees collected</span><span className="font-bold text-emerald-700">₦{metrics.revenueToday.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Fees pending</span><span className={`font-bold ${metrics.pendingFees > 0 ? "text-amber-600" : "text-slate-400"}`}>₦{metrics.pendingFees.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Admissions today</span><span className="font-bold text-slate-800">{metrics.admissionsToday}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lab tests ordered</span><span className="font-bold text-violet-700">{metrics.labOrderedToday}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
