"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  HrPageHeader,
  HrStatusBadge,
  HrBtnPrimary,
  HrAvatar,
} from "@/components/hr/hr-ui";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

type DisciplineRecord = {
  id: string;
  staffName: string;
  department: string;
  issue: string;
  date: string;
  action: string;
  status: "Active" | "Closed";
};

const INITIAL: DisciplineRecord[] = [];

export default function DisciplineRecordsPage() {
  const [records] = useState(INITIAL);
  const [search, setSearch] = useState("");

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.staffName.toLowerCase().includes(q) || r.issue.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <HrPageHeader
        title="Discipline Records"
        subtitle="Track disciplinary actions, warnings, and case resolution."
        action={<HrBtnPrimary href={`${INTERNAL_PREFIX}/hr/staff-management`}>+ Add Record</HrBtnPrimary>}
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff or issue…"
            className="min-w-[200px] flex-1 rounded-none border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:bg-white"
          />
          <span className="text-xs text-slate-400">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Member</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Issue</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Action Taken</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    No discipline records yet. Cases added by HR will appear here.
                  </td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <HrAvatar name={r.staffName} size="sm" />
                      <span className="font-medium text-slate-800">{r.staffName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{r.department}</td>
                  <td className="px-5 py-3 text-slate-600">{r.issue}</td>
                  <td className="px-5 py-3 text-slate-600">{r.date}</td>
                  <td className="px-5 py-3 text-slate-700">{r.action}</td>
                  <td className="px-5 py-3"><HrStatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
