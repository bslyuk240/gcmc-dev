"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type LogEntry = {
  id: string;
  time: string;
  event: string;
  user: string;
  ip: string;
  status: string;
};

const STATUS_STYLES: Record<string, string> = {
  Success: "bg-emerald-50 text-emerald-700",
  Failed:  "bg-red-50 text-red-700",
  Warning: "bg-amber-50 text-amber-700",
};

export default function ITSystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const sb = createClient();
        if (!sb) return;
        // Attempt to query a system_logs table if it exists;
        // falls back gracefully with an empty result
        const { data } = await sb
          .from("system_logs")
          .select("id, created_at, event, user_email, ip_address, status")
          .order("created_at", { ascending: false })
          .limit(100);

        if (data && data.length > 0) {
          const mapped: LogEntry[] = (data as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            time: new Date(row.created_at as string).toLocaleTimeString("en-GB", {
              hour: "2-digit", minute: "2-digit",
            }),
            event: (row.event as string) ?? "System Event",
            user: (row.user_email as string) ?? "—",
            ip: (row.ip_address as string) ?? "—",
            status: (row.status as string) ?? "Success",
          }));
          setLogs(mapped);
        }
      } catch {
        // Table may not exist yet — show empty state
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = logs.filter((row) => {
    const q = search.toLowerCase();
    return !q || row.user.toLowerCase().includes(q) || row.event.toLowerCase().includes(q) || row.ip.includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Logs"
        description="Authentication and system events across the HMS platform."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, event, or IP..."
            className="min-w-[200px] rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          {!loading && (
            <span className="text-xs text-slate-400">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-6 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-slate-500">No system events yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Login, logout, and system events will be recorded here as the system is used.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Time", "Event", "User", "IP Address", "Status"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{row.time}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.event}</td>
                    <td className="px-4 py-3 text-slate-600">{row.user}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.ip}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
