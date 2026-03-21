"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const CONSULTATIONS: { id: string; patient: string; doctor: string; type: string; time: string; status: string; rxWritten: boolean }[] = [];

const DOCTORS: { name: string; specialty: string; consultations: number; active: number; avgTime: string; status: string }[] = [];

const STATUS_STYLES: Record<string, string> = {
  in_progress: "bg-violet-50 text-violet-700",
  completed: "bg-emerald-50 text-emerald-700",
};
const DR_STATUS: Record<string, string> = {
  Busy: "bg-amber-50 text-amber-700",
  Available: "bg-emerald-50 text-emerald-700",
};

export default function AdminDoctorsMonitorPage() {
  const activeConsults = CONSULTATIONS.filter((c) => c.status === "in_progress").length;
  const completed = CONSULTATIONS.filter((c) => c.status === "completed").length;
  const rxCount = CONSULTATIONS.filter((c) => c.rxWritten).length;
  const busyDoctors = DOCTORS.filter((d) => d.status === "Busy").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Doctors Monitor" description="Clinical operations — consultations, doctor workload, prescriptions, and patient throughput." />
      </div>

      <div className="flex gap-3">
        {[
          { label: "Active Consultations", value: activeConsults, color: "text-violet-700" },
          { label: "Completed Today", value: completed, color: "text-emerald-700" },
          { label: "Prescriptions Written", value: rxCount, color: "text-sky-700" },
          { label: "Doctors Busy", value: `${busyDoctors}/${DOCTORS.length}`, color: busyDoctors === DOCTORS.length ? "text-red-600" : "text-amber-600" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-2xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor workload */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Doctor Workload Today</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Doctor", "Specialty", "Consultations", "Active Now", "Avg. Time", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DOCTORS.map((d) => (
                    <tr key={d.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{d.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.specialty}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{d.consultations}</td>
                      <td className="px-4 py-3 font-bold text-violet-700">{d.active}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{d.avgTime}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DR_STATUS[d.status]}`}>{d.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent consultations */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recent Consultations</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {CONSULTATIONS.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-slate-900">{c.patient}</p>
                      <span className="text-xs text-slate-400">·</span>
                      <p className="text-xs text-slate-500">{c.doctor}</p>
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">{c.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.rxWritten && <span className="text-xs font-semibold text-sky-700">Rx written</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>
                      {c.status === "in_progress" ? "In Progress" : "Completed"}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{c.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Consultation Types</h3>
            <div className="space-y-2">
              {["General", "Specialist", "Emergency", "Follow-up", "Antenatal"].map((type) => {
                const count = CONSULTATIONS.filter((c) => c.type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(count / CONSULTATIONS.length) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-4 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Admin Insight</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{completed} consultations completed today.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{busyDoctors} doctors currently in consultations.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />{rxCount} prescriptions written — flowing to Pharmacy.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
