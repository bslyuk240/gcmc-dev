"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import type { ITTicket } from "@/lib/it/types";

const PRIORITY_STYLES: Record<string, string> = {
  Critical: "bg-red-50 text-red-700",
  Urgent: "bg-orange-50 text-orange-700",
  High: "bg-amber-50 text-amber-700",
  Medium: "bg-slate-100 text-slate-600",
  Normal: "bg-slate-100 text-slate-600",
  Low: "bg-slate-100 text-slate-500",
};

const STATUS_STYLES: Record<string, string> = {
  Open: "bg-sky-50 text-sky-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-500",
};

export default function ITDashboardPage() {
  const [tickets, setTickets] = useState<ITTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/it/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openTickets = tickets.filter((t) => t.status === "Open" || t.status === "In Progress");
  const resolved = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed");
  const critical = tickets.filter((t) => t.priority === "Critical" || t.priority === "Urgent");
  const recentTickets = tickets.slice(0, 5);

  const kpi = [
    { label: "Open Tickets", value: String(openTickets.length), change: `${critical.length} critical/urgent`, color: openTickets.length > 0 ? "text-amber-600" : "text-slate-900" },
    { label: "Resolved", value: String(resolved.length), change: "All time", color: "text-emerald-600" },
    { label: "Pending Setup", value: "—", change: "See onboarding queue", color: "text-slate-900" },
    { label: "Critical / Urgent", value: String(critical.length), change: critical.length > 0 ? "Needs attention" : "All clear", color: critical.length > 0 ? "text-red-700" : "text-slate-900" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Helpdesk"
        description="Support hospital staff with access, devices, and technical issues. SaaS platform issues are handled by your software provider."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-2xl font-bold sm:text-3xl ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-slate-500">{k.change}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Recent Tickets</h3>
              <Link href={`${INTERNAL_PREFIX}/it/tickets`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading tickets...</div>
            ) : recentTickets.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No tickets yet. Create one from the tickets page.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left">
                      {["ID", "Issue", "Department", "Priority", "Status", "Assigned"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.ticketRef}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 font-medium text-slate-900">{t.title}</td>
                        <td className="px-4 py-3 text-slate-500">{t.department}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[t.priority] ?? "bg-slate-100"}`}>{t.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[t.status] ?? "bg-slate-100"}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{t.assignedTo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="font-bold text-slate-900">Quick Actions</h3>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {[
              { label: "Chat Inbox", href: `${INTERNAL_PREFIX}/it/chat` },
              { label: "Support Tickets", href: `${INTERNAL_PREFIX}/it/tickets` },
              { label: "User Access", href: `${INTERNAL_PREFIX}/it/user-access` },
              { label: "Onboarding Queue", href: `${INTERNAL_PREFIX}/it/onboarding-queue` },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition">
                {a.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            Review access changes and authentication events in{" "}
            <Link href={`${INTERNAL_PREFIX}/it/audit-logs`} className="font-semibold text-[var(--accent)] hover:underline">Audit Logs</Link>.
          </div>
        </Card>
      </div>
    </div>
  );
}
