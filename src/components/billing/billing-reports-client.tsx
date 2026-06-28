"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Toast, type ToastData } from "@/components/ui/toast";
import { fetchBillingReport, money } from "@/lib/billing/client";
import { departmentLabel } from "@/modules/billing/mappers";
import type { BillingReportSummary } from "@/modules/billing/types";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function BillingReportsClient() {
  const [startDate, setStartDate] = useState(todayInput());
  const [endDate, setEndDate] = useState(todayInput());
  const [summary, setSummary] = useState<BillingReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setSummary(await fetchBillingReport({ start: startDate, end: endDate }));
      } catch (error) {
        setToast({ message: error instanceof Error ? error.message : "Failed to load report.", type: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Reports" description="Revenue, outflows, and open receivables from the billing ledger." />
      <div className="flex flex-wrap gap-3">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
      {loading || !summary ? (
        <p className="text-sm text-slate-400">Loading report…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Revenue", value: money(summary.revenue) },
              { label: "Outflows", value: money(summary.outflows) },
              { label: "Net", value: money(summary.net) },
              { label: "Open AR", value: money(summary.openBalance) },
            ].map((card) => (
              <Card key={card.label} className="px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold">By department</h2></div>
              <div className="divide-y divide-slate-100">
                {summary.byDepartment.map((row) => (
                  <div key={row.department} className="flex justify-between px-5 py-3 text-sm">
                    <span>{departmentLabel(row.department)} ({row.count})</span>
                    <span className="font-semibold">{money(row.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold">By payment method</h2></div>
              <div className="divide-y divide-slate-100">
                {summary.byMethod.map((row) => (
                  <div key={row.method} className="flex justify-between px-5 py-3 text-sm">
                    <span>{row.method} ({row.count})</span>
                    <span className="font-semibold">{money(row.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
