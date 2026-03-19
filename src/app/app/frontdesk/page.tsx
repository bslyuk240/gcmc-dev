"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useHMSSession } from "@/modules/rbac/hooks";
import {
  fetchPatientRegistrations,
  fetchTodayVisits,
  fetchMyShiftToday,
  type PatientRegistration,
  type VisitRow,
  type NcShift,
} from "@/lib/supabase/db";

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function formatTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const SHIFT_LABELS: Record<string, string> = {
  morning: "Morning shift",
  afternoon: "Afternoon shift",
  night: "Night shift",
  on_call: "On Call",
};

export default function FrontdeskPage() {
  const session = useHMSSession();

  const [registrations, setRegistrations] = useState<PatientRegistration[]>([]);
  const [visits, setVisits]               = useState<VisitRow[]>([]);
  const [myShift, setMyShift]             = useState<NcShift | null | "none">(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [regs, vis] = await Promise.all([
        fetchPatientRegistrations(),
        fetchTodayVisits(),
      ]);
      setRegistrations(regs);
      setVisits(vis);

      if (session?.staff_id) {
        const shift = await fetchMyShiftToday(session.staff_id);
        setMyShift(shift ?? "none");
      }
      setLoading(false);
    }
    void load();
  }, [session?.staff_id]);

  // Derive today's registrations (registered_at starts with today's date)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRegs = registrations.filter((r) => r.registeredAt?.startsWith(todayStr));

  // KPI counts from real data
  const waiting       = registrations.filter((r) => r.status === "Waiting").length;
  const inConsultation = visits.filter((v) => v.status === "In Consultation" || v.status === "Scheduled").length;
  const chargesCount  = visits.filter((v) => v.status === "Billing" || v.status === "Discharged").length;

  const metrics = [
    {
      label: "Registered Today",
      value: loading ? "—" : todayRegs.length.toString(),
      note: "New registrations today",
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Waiting",
      value: loading ? "—" : waiting.toString(),
      note: "In waiting area now",
      tone: "text-teal-700 bg-teal-50",
    },
    {
      label: "Consultation Queue",
      value: loading ? "—" : inConsultation.toString(),
      note: "Active or scheduled visits",
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: "To Accounts",
      value: loading ? "—" : chargesCount.toString(),
      note: "Discharged / pending billing",
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  const recentRegs = todayRegs.slice(0, 5);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Front Desk</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Patient registration, check-in, and consultation queue</p>
      </div>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
              {metric.label}
            </p>
            <h2 className={`mt-2 text-2xl font-bold sm:text-3xl ${loading ? "text-slate-300" : "text-slate-900"}`}>
              {metric.value}
            </h2>
            <p className={`mt-1 text-[10px] sm:text-xs ${metric.tone} rounded px-1.5 py-0.5 font-semibold w-fit`}>
              {metric.note}
            </p>
          </article>
        ))}
      </section>

      {/* Main content grid */}
      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-4 xl:gap-6">
        {/* Recent registrations table */}
        <div className="space-y-4 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
              <span className="rounded-lg bg-[var(--accent)]/10 p-1.5 text-[var(--accent)]">
                <Icon name="patients" className="h-4 w-4" />
              </span>
              Today&apos;s Registrations
            </h3>
            <Link href="/app/frontdesk/patients"
              className="text-xs font-semibold text-[var(--accent)] hover:underline sm:text-sm">
              View All
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
              </div>
            ) : recentRegs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No registrations today.{" "}
                <Link href="/app/frontdesk/patients/new" className="text-[var(--accent)] underline">
                  Register a patient
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {["Patient Name", "ID", "Time", "Contact", "Status", ""].map((col, i) => (
                        <th key={col + i}
                          className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRegs.map((patient) => (
                      <tr key={patient.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">
                              {patient.initials || getInitials(patient.patientName)}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{patient.patientName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{patient.patientId || "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatTime(patient.registeredAt)}</td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 sm:table-cell">
                          {patient.contact || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={patient.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href="/app/frontdesk/patients"
                            className="rounded p-1 text-slate-400 hover:text-[var(--accent)] transition inline-flex">
                            <Icon name="view" className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && recentRegs.length > 0 && (
              <div className="border-t border-slate-100 p-3 text-center">
                <Link href="/app/frontdesk/patients"
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 transition hover:text-[var(--accent)]">
                  View all patients →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 sm:text-base">
            <span className="rounded-lg bg-[var(--accent)]/10 p-1.5 text-[var(--accent)]">
              <Icon name="plus" className="h-4 w-4" />
            </span>
            Quick Actions
          </h3>

          <div className="space-y-2.5">
            <Link href="/app/frontdesk/patients"
              className="flex w-full items-center gap-3 rounded-xl bg-[var(--accent)] p-3.5 text-left text-white shadow-md shadow-[var(--accent)]/20 transition hover:-translate-y-0.5 sm:p-4">
              <div className="rounded-lg bg-white/20 p-1.5">
                <Icon name="user-add" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Register New Patient</p>
                <p className="text-[10px] font-medium text-white/80">Add to system registry</p>
              </div>
            </Link>
            <Link href="/app/frontdesk/patients"
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-[var(--accent)]/40 sm:p-4">
              <div className="rounded-lg bg-[var(--accent)]/10 p-1.5 text-[var(--accent)]">
                <Icon name="search" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Find Patient</p>
                <p className="text-[10px] font-medium text-slate-500">Search existing records</p>
              </div>
            </Link>
            <Link href="/app/frontdesk/visits"
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-[var(--accent)]/40 sm:p-4">
              <div className="rounded-lg bg-[var(--accent)]/10 p-1.5 text-[var(--accent)]">
                <Icon name="plus" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Create Visit</p>
                <p className="text-[10px] font-medium text-slate-500">New check-in instance</p>
              </div>
            </Link>
          </div>

          {/* Today's shift — real data */}
          <div className="rounded-xl border border-[var(--accent)]/10 bg-[var(--accent)]/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 sm:text-sm">Today&apos;s Shift</h4>
              <Link href="/staff/rota" className="text-[10px] font-bold uppercase text-[var(--accent)] hover:underline">
                My Rota
              </Link>
            </div>
            {myShift === null ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : myShift === "none" ? (
              <p className="text-xs text-slate-400">No shift assigned for today.</p>
            ) : (
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <div>
                    <p className="font-semibold text-slate-900">{SHIFT_LABELS[myShift.shiftType] ?? myShift.shiftType}</p>
                    <p>{myShift.shiftStart} – {myShift.shiftEnd}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <p className="capitalize font-medium text-emerald-700">{myShift.status}</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    Waiting:         "bg-amber-50 text-amber-700",
    "In Consultation": "bg-sky-50 text-sky-700",
    Discharged:      "bg-green-50 text-green-700",
    Referred:        "bg-violet-50 text-violet-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}
