"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const VISITS = [
  { id: "V-5825", patient: "Abena Kyei", type: "Antenatal", doctor: "Dr. Amaka Osei", time: "10:20", status: "With Doctor" },
  { id: "V-5824", patient: "Yaw Darko", type: "Emergency", doctor: "Dr. Kwame Mensah", time: "10:05", status: "With Doctor" },
  { id: "V-5823", patient: "Efua Boateng", type: "Follow-up", doctor: "Dr. Chen", time: "09:50", status: "In Queue" },
  { id: "V-5822", patient: "Kwame Asante", type: "Routine Check-up", doctor: "Dr. Smith", time: "09:30", status: "Completed" },
  { id: "V-5821", patient: "Grace Owusu", type: "Lab/Diagnostics", doctor: "Dr. Osei", time: "09:10", status: "Completed" },
  { id: "V-5820", patient: "Mark Antwi", type: "Outpatient Consultation", doctor: "Dr. Amaka Osei", time: "08:55", status: "Completed" },
];

const HOURLY = [
  { hour: "08:00", count: 8 }, { hour: "09:00", count: 14 }, { hour: "10:00", count: 11 },
  { hour: "11:00", count: 7 }, { hour: "12:00", count: 5 }, { hour: "13:00", count: 3 },
];

const STATUS_STYLES: Record<string, string> = {
  "Checked In": "bg-sky-50 text-sky-700",
  "In Queue": "bg-amber-50 text-amber-700",
  "With Doctor": "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const TYPE_COLORS: Record<string, string> = {
  Emergency: "bg-red-100 text-red-700",
  Antenatal: "bg-pink-100 text-pink-700",
  "Follow-up": "bg-sky-100 text-sky-700",
  "Routine Check-up": "bg-emerald-100 text-emerald-700",
  "Outpatient Consultation": "bg-violet-100 text-violet-700",
  "Lab/Diagnostics": "bg-amber-100 text-amber-700",
};

const checkedIn = VISITS.filter((v) => v.status !== "Completed").length;
const completedToday = VISITS.filter((v) => v.status === "Completed").length;
const peakHour = HOURLY.reduce((a, b) => b.count > a.count ? b : a, HOURLY[0]);
const maxCount = Math.max(...HOURLY.map((h) => h.count));

export default function AdminFrontdeskMonitorPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Front Desk Monitor"
          description="Patient registration flow, visit creation, check-in queue, and service throughput."
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Currently Active Visits", value: checkedIn, color: "text-violet-700" },
          { label: "Completed Today", value: completedToday, color: "text-emerald-700" },
          { label: "Total Registered Today", value: VISITS.length, color: "text-slate-900" },
          { label: "Peak Hour", value: peakHour.hour, color: "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-3 px-4 py-3">
            <p className={`shrink-0 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold leading-tight text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2 sm:space-y-6">
          {/* Visit queue */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <h3 className="font-bold text-slate-900">Today&apos;s Visit Queue</h3>
              <p className="text-xs text-slate-400">Live data from Front Desk</p>
            </div>
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {VISITS.map((v) => (
                  <Card key={v.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{v.patient}</p>
                        <p className="mt-0.5 text-[11px] font-mono text-slate-400">{v.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>{v.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Visit Type</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{v.type}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Doctor</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{v.doctor}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Time</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{v.time}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">{v.status}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["ID", "Patient", "Visit Type", "Assigned Doctor", "Time", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {VISITS.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{v.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{v.patient}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[v.type] ?? "bg-slate-100 text-slate-600"}`}>{v.type}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{v.doctor}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{v.time}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status] ?? "bg-slate-100 text-slate-600"}`}>{v.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          </Card>

          {/* Hourly flow chart */}
          <Card className="p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 mb-1">Hourly Registration Flow</h3>
            <p className="text-xs text-slate-400 mb-4">Patient registrations and check-ins by hour</p>
            <div className="flex items-end gap-2 h-28">
              {HOURLY.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-700">{h.count}</span>
                  <div
                    className="w-full rounded-t-md bg-accent opacity-80 transition-all"
                    style={{ height: `${(h.count / maxCount) * 80}px` }}
                  />
                  <span className="text-[10px] text-slate-400">{h.hour}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-3 sm:space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 mb-3">Visit Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(
                VISITS.reduce<Record<string, number>>((acc, v) => { acc[v.type] = (acc[v.type] ?? 0) + 1; return acc; }, {})
              ).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(count / VISITS.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <h3 className="font-bold text-slate-900 mb-3">Admin Insight</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />Registration throughput is normal. {completedToday} visits completed.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{checkedIn} patients currently in active visit flow.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />Peak activity at {peakHour.hour} with {peakHour.count} registrations.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
