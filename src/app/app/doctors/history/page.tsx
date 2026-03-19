"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "neutral"> = {
  "Completed": "success",
  "Admitted": "info",
  "In Progress": "warning",
  "Awaiting Results": "neutral",
};

export default function DoctorsHistoryPage() {
  const { consultations } = useDoctorsStore();
  const [search, setSearch] = useState("");

  const sorted = [...consultations].sort((a, b) => {
    // Sort by date descending (newest first)
    return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
  });

  const filtered = sorted.filter((c) =>
    search === "" ||
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.doctorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultation History"
        description="All consultation records sorted by date, newest first."
      />

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by patient or doctor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm min-w-[240px]"
          />
          <span className="text-sm text-slate-500">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            {consultations.length === 0 ? (
              <>
                <p className="text-sm font-medium text-slate-500">No consultation records yet.</p>
                <p className="mt-1 text-xs text-slate-400">Records will appear here once consultations are completed.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-500">No results match your search.</p>
                <p className="mt-1 text-xs text-slate-400">Try a different patient or doctor name.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-3 font-semibold text-slate-500">Patient</th>
                  <th className="pb-3 font-semibold text-slate-500">Doctor</th>
                  <th className="pb-3 font-semibold text-slate-500">Type</th>
                  <th className="pb-3 font-semibold text-slate-500">Date</th>
                  <th className="pb-3 font-semibold text-slate-500">Status</th>
                  <th className="pb-3 font-semibold text-slate-500">Fee</th>
                  <th className="pb-3 font-semibold text-slate-500">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{row.patientName}</p>
                      <p className="text-xs text-slate-400">{row.patientId}</p>
                    </td>
                    <td className="py-3 text-slate-600">{row.doctorName}</td>
                    <td className="py-3 text-slate-600">{row.consultType}</td>
                    <td className="py-3 text-slate-600">
                      <span>{row.date}</span>
                      {row.time && <span className="ml-1 text-xs text-slate-400">{row.time}</span>}
                    </td>
                    <td className="py-3">
                      <StatusBadge variant={STATUS_VARIANT[row.status] ?? "neutral"}>
                        {row.status}
                      </StatusBadge>
                    </td>
                    <td className="py-3 text-slate-700 font-medium">
                      ₦{row.consultFee.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.feePaid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {row.feePaid ? "Paid" : "Pending"}
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
