"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Log = { time: string; action: string; entity: string; actor: string; dept: string; ip: string };

const ALL_LOGS: Log[] = [
  { time: "10:05", action: "Patient updated", entity: "Patient #PT-8234", actor: "Grace Boateng", dept: "Front Desk", ip: "10.0.1.45" },
  { time: "09:42", action: "Payment received", entity: "INV-0081", actor: "Kwame Mensah", dept: "Accounts", ip: "10.0.1.12" },
  { time: "09:27", action: "Prescription dispensed", entity: "RX-12031", actor: "James Adu", dept: "Pharmacy", ip: "10.0.1.31" },
  { time: "09:15", action: "User login", entity: "USR-002 Dr. Nwosu", actor: "Dr. Nwosu", dept: "Doctors", ip: "10.0.1.20" },
  { time: "09:00", action: "Triage entry created", entity: "TRG-008", actor: "Nurse Patricia", dept: "Nurses", ip: "10.0.1.55" },
  { time: "08:50", action: "Approval rejected", entity: "APR-0041", actor: "Admin Officer", dept: "Admin", ip: "10.0.1.2" },
  { time: "08:40", action: "Stock request created", entity: "REQ-2841", actor: "Nurse Patricia", dept: "Store", ip: "10.0.1.55" },
  { time: "08:30", action: "User role changed", entity: "USR-005", actor: "Kwame IT", dept: "IT", ip: "10.0.1.99" },
  { time: "08:20", action: "Leave request submitted", entity: "LR-0021", actor: "Dr. Julianne", dept: "HR", ip: "10.0.1.20" },
  { time: "08:10", action: "Invoice created", entity: "INV-0083", actor: "Kofi Accounts", dept: "Accounts", ip: "10.0.1.12" },
  { time: "08:00", action: "System login", entity: "Admin panel", actor: "Admin Officer", dept: "Admin", ip: "10.0.1.2" },
  { time: "07:55", action: "Patient registered", entity: "Patient #PT-8250", actor: "Grace Boateng", dept: "Front Desk", ip: "10.0.1.45" },
];

const ACTION_TYPES = ["All actions", "Patient updated", "Payment received", "Prescription dispensed", "User login", "Triage entry created", "Approval rejected", "Stock request created", "User role changed", "Leave request submitted", "Invoice created", "System login", "Patient registered"];

const PAGE_SIZE = 8;

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All actions");
  const [page, setPage] = useState(0);

  const filtered = ALL_LOGS.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch = !q || log.action.toLowerCase().includes(q) || log.entity.toLowerCase().includes(q) || log.actor.toLowerCase().includes(q);
    const matchAction = actionFilter === "All actions" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Critical actions and changes across all departments."
      />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search action, entity, or actor…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[var(--accent)]"
          >
            {ACTION_TYPES.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Time", "Action", "Entity", "Actor", "Department", "IP Address"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{row.time}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{row.action}</td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{row.entity}</td>
                  <td className="px-5 py-3 text-slate-700">{row.actor}</td>
                  <td className="px-5 py-3 text-slate-500">{row.dept}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{row.ip}</td>
                </tr>
              ))}
              {paginated.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">No log entries matching your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-400">{filtered.length} entries · Page {page + 1} of {Math.max(1, totalPages)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
