import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const KPI = [
  { label: "Open Tickets", value: "12", change: "4 escalated", up: false, color: "text-amber-600" },
  { label: "Resolved Today", value: "8", change: "+3 vs yesterday", up: true, color: "text-emerald-600" },
  { label: "System Uptime", value: "99.8%", change: "Last 30 days", up: true, color: "text-slate-900" },
  { label: "Active Users", value: "131", change: "of 148 staff", up: true, color: "text-slate-900" },
];

const TICKETS = [
  { id: "IT-1028", title: "Printer offline — Registration", dept: "Front Desk", priority: "Urgent", status: "Open", assigned: "John IT", time: "10 min ago" },
  { id: "IT-1027", title: "Ward 3 terminal offline", dept: "Nurses", priority: "Critical", status: "In Progress", assigned: "John IT", time: "42 min ago" },
  { id: "IT-1026", title: "Dispensing module slowness", dept: "Pharmacy", priority: "High", status: "In Progress", assigned: "Ama IT", time: "1h ago" },
  { id: "IT-1025", title: "EMR access for Dr. Chen", dept: "Doctors", priority: "Normal", status: "Resolved", assigned: "Ama IT", time: "2h ago" },
  { id: "IT-1024", title: "Audit export request", dept: "Admin", priority: "Normal", status: "Resolved", assigned: "John IT", time: "3h ago" },
];

const SYSTEM_STATUS = [
  { name: "EMR System", status: "Operational", uptime: "99.9%" },
  { name: "Billing Module", status: "Operational", uptime: "99.8%" },
  { name: "Pharmacy System", status: "Degraded", uptime: "97.1%" },
  { name: "Network / LAN", status: "Operational", uptime: "100%" },
  { name: "File Server", status: "Operational", uptime: "99.7%" },
  { name: "Backup Service", status: "Operational", uptime: "100%" },
];

const RECENT_LOGINS = [
  { user: "Dr. Amaka Osei", dept: "Doctors", ip: "192.168.1.42", time: "10:55", status: "Success" },
  { user: "Nurse Patricia", dept: "Nurses", ip: "192.168.1.51", time: "10:30", status: "Success" },
  { user: "Unknown", dept: "—", ip: "41.223.188.9", time: "09:12", status: "Failed" },
  { user: "James Adu", dept: "Pharmacy", ip: "192.168.1.38", time: "08:47", status: "Success" },
];

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

export default function ITDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="IT Dashboard"
        description="System health, support tickets, and active-user overview."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <p className={`mt-1 text-3xl font-bold ${k.color}`}>{k.value}</p>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    {["ID", "Issue", "Department", "Priority", "Status", "Assigned", "Time"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TICKETS.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate">{t.title}</td>
                      <td className="px-4 py-3 text-slate-500">{t.dept}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.assigned}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <div className="divide-y divide-slate-100">
              {RECENT_LOGINS.map((l, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${l.status === "Failed" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {l.status === "Failed" ? "✕" : "✓"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{l.user}</p>
                    <p className="text-xs text-slate-400">{l.dept} · {l.ip}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{l.time}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${l.status === "Failed" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* System status */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">System Status</h3>
            <ul className="mt-4 space-y-3">
              {SYSTEM_STATUS.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === "Operational" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="truncate text-sm text-slate-700">{s.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">{s.uptime}</span>
                </li>
              ))}
            </ul>
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
