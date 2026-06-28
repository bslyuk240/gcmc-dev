"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor_name: string | null;
  department: string | null;
  portal: string;
  payload: string | null;
  ip_address: string | null;
  created_at: string;
};

const IT_ACTION_KEYWORDS = ["login", "logout", "role", "password", "ticket", "account", "setup", "access", "reset", "permission"];

function isItRelevantLog(log: AuditLogRow): boolean {
  if (log.department === "it") return true;
  const haystack = `${log.action} ${log.entity_type ?? ""}`.toLowerCase();
  return IT_ACTION_KEYWORDS.some((kw) => haystack.includes(kw));
}

const ACTION_COLORS: Record<string, string> = {
  "auth.management.login":     "text-emerald-700 bg-emerald-50",
  "auth.staff.login":          "text-emerald-700 bg-emerald-50",
  "auth.management.logout":    "text-slate-600 bg-slate-100",
  "auth.staff.logout":         "text-slate-600 bg-slate-100",
  "hr.staff_created":          "text-indigo-700 bg-indigo-50",
  "hr.department_head_assigned":"text-purple-700 bg-purple-50",
  "it.password_reset_sent":    "text-amber-700 bg-amber-50",
  "admin.settings_updated":    "text-orange-700 bg-orange-50",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

const PAGE_SIZE = 10;

type AuditLogsPanelProps = {
  scope: "hospital" | "it";
  logs: AuditLogRow[];
};

export function AuditLogsPanel({ scope, logs }: AuditLogsPanelProps) {
  const [search, setSearch]           = useState("");
  const [actionFilter, setActionFilter] = useState("All actions");
  const [page, setPage]               = useState(0);

  const baseLogs = useMemo(
    () => scope === "it" ? logs.filter(isItRelevantLog) : logs,
    [scope, logs],
  );

  const actionTypes = useMemo(
    () => ["All actions", ...Array.from(new Set(baseLogs.map((l) => l.action))).sort()],
    [baseLogs],
  );

  const filtered = baseLogs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      log.action.toLowerCase().includes(q) ||
      (log.actor_name ?? "").toLowerCase().includes(q) ||
      (log.entity_type ?? "").toLowerCase().includes(q) ||
      (log.entity_id ?? "").toLowerCase().includes(q);
    const matchAction = actionFilter === "All actions" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={
          scope === "it"
            ? "Access changes, authentication events, and IT helpdesk activity for this hospital."
            : "Critical actions and changes across all departments."
        }
      />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative min-w-[200px] flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search action, actor…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[var(--accent)]"
          >
            {actionTypes.map((a) => <option key={a}>{a}</option>)}
          </select>
          <span className="text-xs text-slate-400">{filtered.length} events</span>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {paginated.map((row) => (
            <Card key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[row.action] ?? "text-slate-600 bg-slate-100"}`}>
                    {row.action}
                  </span>
                  {row.entity_type && (
                    <p className="mt-1 text-xs text-slate-500">{row.entity_type}{row.entity_id ? ` · ${row.entity_id.slice(0,8)}…` : ""}</p>
                  )}
                </div>
                <span className="font-mono text-xs text-slate-400 whitespace-nowrap">{formatTime(row.created_at)}</span>
              </div>
              <div className="mt-3 grid gap-2">
                <MobileMeta label="Actor"      value={row.actor_name ?? "—"} />
                <MobileMeta label="Department" value={row.department ?? "—"} />
                <MobileMeta label="Portal"     value={row.portal} />
                <MobileMeta label="IP"         value={row.ip_address ?? "—"} />
              </div>
            </Card>
          ))}
          {paginated.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No log entries found.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Time", "Action", "Actor", "Department", "Entity", "IP Address"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{formatTime(row.created_at)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[row.action] ?? "text-slate-600 bg-slate-100"}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-700">{row.actor_name ?? "—"}</td>
                  <td className="px-5 py-3 capitalize text-slate-500">{row.department ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    {row.entity_type ?? "—"}
                    {row.entity_id ? <span className="ml-1 text-slate-400">#{row.entity_id.slice(0,8)}</span> : null}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.ip_address ?? "—"}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                    No audit events yet. Actions taken in this hospital will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-400">
            {filtered.length} events · Page {page + 1} of {Math.max(1, totalPages)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
