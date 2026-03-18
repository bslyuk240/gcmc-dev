import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function ITDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Dashboard"
        description="System health, support tickets, and active-user overview."
      />

      {/* KPI cards — zeroed until real data is wired */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Open Tickets", value: "—", change: "Support requests", color: "text-amber-600" },
          { label: "Resolved Today", value: "—", change: "Closed tickets", color: "text-emerald-600" },
          { label: "System Uptime", value: "—", change: "Last 30 days", color: "text-slate-900" },
          { label: "Active Users", value: "—", change: "Staff logged in", color: "text-slate-900" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-slate-500">{k.change}</p>
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
            </div>
          </Card>

          {/* Recent logins */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Login Activity</h3>
              <Link href={`${INTERNAL_PREFIX}/it/system-logs`} className="text-sm font-semibold text-[var(--accent)] hover:underline">
                View logs →
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
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
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-slate-500">No records yet.</p>
              <p className="mt-1 text-xs text-slate-400">Data will appear here once entries are created.</p>
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
