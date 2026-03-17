import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const logs = [
  { time: "10:12", event: "Login", user: "sarah.jenkins@gcmc.local", ip: "192.168.1.10", status: "Success" },
  { time: "10:05", event: "Failed login", user: "unknown", ip: "10.0.0.5", status: "Failed" },
];

export default function ITSystemLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Authentication and system events."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search user or event..."
            className="min-w-[200px] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-3 font-semibold text-slate-500">Time</th>
                <th className="pb-3 font-semibold text-slate-500">Event</th>
                <th className="pb-3 font-semibold text-slate-500">User</th>
                <th className="pb-3 font-semibold text-slate-500">IP</th>
                <th className="pb-3 font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((row, i) => (
                <tr key={i}>
                  <td className="py-3 text-slate-600">{row.time}</td>
                  <td className="py-3 font-medium text-slate-900">{row.event}</td>
                  <td className="py-3 text-slate-600">{row.user}</td>
                  <td className="py-3 text-slate-600">{row.ip}</td>
                  <td className="py-3 text-slate-600">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
