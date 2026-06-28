"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { STORE_UPDATED_EVENT, fetchStoreReports, money } from "@/lib/store/client";
import type { StoreReportSummary } from "@/modules/store/types";

export function StoreReportsClient() {
  const [summary, setSummary] = useState<StoreReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await fetchStoreReports());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(STORE_UPDATED_EVENT, load);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, load);
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title="Store Reports" description="Stock valuation, movement summary, and replenishment signals." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total SKUs", value: summary?.totalSkus ?? 0 },
          { label: "Stock value", value: summary ? money(summary.stockValue) : "—" },
          { label: "Issues (month)", value: summary?.issuesThisMonth ?? 0 },
          { label: "Receipts (month)", value: summary?.receiptsThisMonth ?? 0 },
        ].map((kpi) => (
          <Card key={kpi.label} className="px-4 py-4">
            <p className="text-xl font-bold text-slate-900">{loading ? "—" : kpi.value}</p>
            <p className="text-sm text-slate-600">{kpi.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Top issued items (month)</h3>
          {(summary?.topIssued ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No issues this month.</p>
          ) : (
            <ul className="space-y-2">
              {summary?.topIssued.map((row) => (
                <li key={row.itemName} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{row.itemName}</span>
                  <span className="font-semibold">{row.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Replenishment list</h3>
          {(summary?.lowStock ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No low-stock items.</p>
          ) : (
            <ul className="space-y-2">
              {summary?.lowStock.map((item) => (
                <li key={item.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span className="font-semibold">{item.currentStock} / {item.reorderLevel}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
