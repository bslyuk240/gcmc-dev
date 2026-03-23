"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { fetchITSystemStatus, type ITSystemStatus } from "@/lib/supabase/db";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700",
  Urgent: "bg-orange-50 text-orange-700",
  High: "bg-amber-50 text-amber-700",
  Normal: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
};

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function ITDashboardPage() {
  const { itTickets } = useAdminStore();
  const [systemStatus, setSystemStatus] = useState<ITSystemStatus[]>([]);

  useEffect(() => {
    fetchITSystemStatus().then(setSystemStatus);
  }, []);

  const openTickets = itTickets.filter((t) => t.status === "Open");
  const resolvedToday = itTickets.filter((t) => t.status === "Resolved");
  const escalated = itTickets.filter((t) => t.priority === "Critical");
  const recentTickets = itTickets.slice(0, 5);

  const kpi = [
    { label: "Open Tickets", value: String(openTickets.length), change: `${escalated.length} escalated`, up: false, color: "text-amber-600" },
    { label: "Resolved", value: String(resolvedToday.length), change: "Total resolved", up: true, color: "text-emerald-600" },
    { label: "System Uptime", value: "—", change: "Check system tab", up: true, color: "text-slate-900" },
    { label: "Escalated (Critical)", value: String(escalated.length), change: "Needs attention", up: false, color: escalated.length > 0 ? "text-red-700" : "text-slate-900" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Dashboard"
        description="System health, support tickets, and active-user overview."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${k.color}`}>{k.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-sm ${k.up ? "text-emerald-600" : "text-slate-500"}`}>
              {k.up && (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {k.change}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Tickets */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Tickets</h3>
              <Link href={`${INTERNAL_PREFIX}/it/tickets`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View all →
              </Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">No tickets yet.</p>
                <p className="mt-1 text-xs text-slate-400">Tickets will appear here once created.</p>
              </div>
            ) : (
              <>
              <div className="space-y-3 p-3 md:hidden">
                {recentTickets.map((t) => (
                  <Card key={t.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{t.title}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{t.id}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-500"}`}>{t.status}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <MobileMeta label="Department" value={t.department} />
                      <MobileMeta label="Priority" value={t.priority} />
                      <MobileMeta label="Assigned" value={t.assignedTo || "—"} />
                      <MobileMeta label="Opened" value={t.openedAt} />
                    </div>
                  </Card>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["ID", "Issue", "Department", "Priority", "Status", "Assigned", "Opened"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate">{t.title}</td>
                        <td className="px-4 py-3 text-slate-500">{t.department}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[t.priority] ?? "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-500"}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.assignedTo || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">{t.openedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </Card>

          {/* Recent login activity placeholder */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Login Activity</h3>
              <Link href={`${INTERNAL_PREFIX}/it/system-logs`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View logs →
              </Link>
            </div>
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* System status */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">System Status</h3>
            {systemStatus.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">No system status records.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {systemStatus.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === "Operational" ? "bg-emerald-400" : s.status === "Degraded" ? "bg-amber-400" : "bg-red-500"}`} />
                      <span className="truncate text-sm text-slate-700">{s.name}</span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">{s.uptime}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Quick actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Chat Inbox", href: `${INTERNAL_PREFIX}/it/chat` },
                { label: "Tickets", href: `${INTERNAL_PREFIX}/it/tickets` },
                { label: "User Access", href: `${INTERNAL_PREFIX}/it/user-access` },
                { label: "System", href: `${INTERNAL_PREFIX}/it/system` },
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
        </div>
      </div>
    </div>
  );
}
