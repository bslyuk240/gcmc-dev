"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { STORE_UPDATED_EVENT, displayReqStatus, fetchStoreDashboard } from "@/lib/store/client";
import type { StoreDashboardSummary } from "@/modules/store/types";

const STATUS_COLORS: Record<string, string> = {
  OK: "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-orange-50 text-orange-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

export function StoreDashboardClient() {
  const [data, setData] = useState<StoreDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchStoreDashboard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(STORE_UPDATED_EVENT, load);
    return () => window.removeEventListener(STORE_UPDATED_EVENT, load);
  }, [load]);

  const kpis = [
    { label: "Total SKUs", value: data?.totalSkus ?? 0, sub: "Active items" },
    { label: "Stock Alerts", value: data?.stockAlerts ?? 0, sub: "Low / critical / OOS" },
    { label: "Open Requisitions", value: data?.openRequisitions ?? 0, sub: "Awaiting issue" },
    { label: "POs In Progress", value: data?.ordersInProgress ?? 0, sub: "Procurement pipeline" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Store Dashboard"
        description="Inventory balances, requisitions, procurement, and stock movement activity."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="px-4 py-4">
            <p className="text-2xl font-bold text-slate-900">{loading ? "—" : kpi.value}</p>
            <p className="text-sm font-semibold text-slate-700">{kpi.label}</p>
            <p className="text-xs text-slate-500">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Low stock items</h3>
            <Link href={`${INTERNAL_PREFIX}/store/inventory`} className="text-xs font-semibold text-teal-700">View all</Link>
          </div>
          {(data?.lowStockItems ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{loading ? "Loading…" : "All items within reorder levels."}</p>
          ) : (
            <div className="space-y-2">
              {data?.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.currentStock} {item.unit} · reorder {item.reorderLevel}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[item.status] ?? ""}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent requisitions</h3>
            <Link href={`${INTERNAL_PREFIX}/store/requisitions`} className="text-xs font-semibold text-teal-700">Open queue</Link>
          </div>
          {(data?.recentRequisitions ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">{loading ? "Loading…" : "No requisitions yet."}</p>
          ) : (
            <div className="space-y-2">
              {data?.recentRequisitions.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{req.id} · {req.department}</p>
                    <p className="text-xs text-slate-500">{req.lines[0]?.itemName ?? "Items"} · {req.requestedBy}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{displayReqStatus(req.status)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent stock movements</h3>
          <Link href={`${INTERNAL_PREFIX}/store/movements`} className="text-xs font-semibold text-teal-700">Ledger</Link>
        </div>
        {(data?.recentMovements ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">{loading ? "Loading…" : "No movements recorded yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2 pr-4">Item</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Qty</th>
                  <th className="pb-2 pr-4">Balance</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentMovements.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">{m.itemName ?? m.itemId}</td>
                    <td className="py-2 pr-4 capitalize">{m.movementType}</td>
                    <td className={`py-2 pr-4 font-medium ${m.qtyDelta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                      {m.qtyDelta > 0 ? "+" : ""}{m.qtyDelta}
                    </td>
                    <td className="py-2 pr-4">{m.qtyAfter}</td>
                    <td className="py-2 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.pendingApprovalPos > 0 && (
        <Card className="border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-900">
            {data.pendingApprovalPos} purchase order(s) awaiting admin approval.
          </p>
        </Card>
      )}
    </div>
  );
}
