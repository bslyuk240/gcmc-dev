"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useDoctorsStore } from "@/lib/hooks/use-doctors-store";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "neutral"> = {
  Completed: "success",
  Admitted: "info",
  "In Progress": "warning",
  "Awaiting Results": "neutral",
};

function MobileMeta({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs font-medium text-slate-700">{value}</div>
    </div>
  );
}

export default function DoctorsHistoryPage() {
  const { consultations } = useDoctorsStore();
  const [search, setSearch] = useState("");

  const sorted = [...consultations].sort((a, b) => {
    // Sort by date descending (newest first)
    return b.date.localeCompare(a.date) || b.time.localeCompare(a.time);
  });

  const filtered = sorted.filter(
    (c) =>
      search === "" ||
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      c.doctorName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Consultation History" description="All consultation records sorted by date, newest first." />

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search by patient or doctor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm sm:min-w-[240px]"
          />
          <span className="text-sm text-slate-500">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
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
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((row) => (
                <div key={row.id} className="space-y-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{row.patientName}</p>
                      <p className="text-[10px] text-slate-400">{row.patientId}</p>
                    </div>
                    <StatusBadge variant={STATUS_VARIANT[row.status] ?? "neutral"}>{row.status}</StatusBadge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <MobileMeta label="Doctor" value={row.doctorName} />
                    <MobileMeta label="Type" value={row.consultType} />
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <MobileMeta label="Date" value={row.date} />
                    <MobileMeta label="Fee" value={`N${row.consultFee.toLocaleString()}`} />
                  </div>
                  <div
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.feePaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {row.feePaid ? "Paid" : "Pending"}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
                        <StatusBadge variant={STATUS_VARIANT[row.status] ?? "neutral"}>{row.status}</StatusBadge>
                      </td>
                      <td className="py-3 font-medium text-slate-700">â‚¦{row.consultFee.toLocaleString()}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            row.feePaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.feePaid ? "Paid" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
