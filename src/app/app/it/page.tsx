"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAdminStore } from "@/lib/hooks/use-admin-store";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700",
  Urgent: "bg-orange-100 text-orange-700",
  High: "bg-amber-100 text-amber-700",
  Normal: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

const SYSTEM_SERVICES = [
  { name: "Patient Database", description: "Supabase PostgreSQL" },
  { name: "Authentication", description: "Supabase Auth" },
  { name: "File Storage", description: "Supabase Storage" },
  { name: "Web Application", description: "Next.js App Server" },
];

export default function ITDashboardPage() {
  const { itTickets, metrics } = useAdminStore();

  const openTickets = itTickets.filter((t) => t.status === "Open");
  const inProgressTickets = itTickets.filter((t) => t.status === "In Progress");
  const resolvedTickets = itTickets.filter((t) => t.status === "Resolved" || t.status === "Closed");
  const todayStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const resolvedToday = resolvedTickets.filter((t) => t.resolvedAt?.includes(todayStr) ?? false);

  const recentTickets = [...itTickets]
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
    .slice(0, 5);

  const kpis = [
    { label: "Open Tickets", value: openTickets.length, change: "Support requests", color: "text-amber-600" },
    { label: "In Progress", value: inProgressTickets.length, change: "Being worked on", color: "text-violet-600" },
    { label: "Resolved Today", value: resolvedToday.length, change: "Closed tickets", color: "text-emerald-600" },
    { label: "Total Tickets", value: itTickets.length, change: "All time", color: "text-slate-900" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Dashboard"
        description="System health, support tickets, and active-user overview."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-slate-500">{k.change}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Tickets */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Tickets</h3>
              <Link href={`${INTERNAL_PREFIX}/it/tickets`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View all →
              </Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-500">No tickets yet.</p>
                <p className="mt-1 text-xs text-slate-400">Tickets will appear here once created in the Tickets section.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["ID", "Title", "Dept", "Priority", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                        <td className="px-5 py-3 font-medium text-slate-900 max-w-[200px] truncate">{t.title}</td>
                        <td className="px-5 py-3 text-slate-600">{t.department}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIORITY_STYLES[t.priority] ?? "bg-slate-100 text-slate-600"}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Ticket breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-4">Ticket Breakdown</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Open", count: openTickets.length, color: "text-sky-600", bg: "bg-sky-50" },
                { label: "In Progress", count: inProgressTickets.length, color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Critical", count: itTickets.filter((t) => t.priority === "Critical" && (t.status === "Open" || t.status === "In Progress")).length, color: "text-red-600", bg: "bg-red-50" },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`rounded-xl ${bg} p-4 text-center`}>
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs font-medium text-slate-600 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* System Status */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-4">System Status</h3>
            <div className="space-y-3">
              {SYSTEM_SERVICES.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{svc.name}</p>
                    <p className="text-xs text-slate-400">{svc.description}</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Chat Inbox", href: `${INTERNAL_PREFIX}/it/chat` },
                { label: "Tickets", href: `${INTERNAL_PREFIX}/it/tickets` },
                { label: "User Access", href: `${INTERNAL_PREFIX}/it/user-access` },
                { label: "System Logs", href: `${INTERNAL_PREFIX}/it/system-logs` },
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
