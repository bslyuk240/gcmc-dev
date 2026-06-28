"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { STORE_UPDATED_EVENT, fetchStoreMovements } from "@/lib/store/client";
import type { StoreMovement } from "@/modules/store/types";

export function StoreMovementsClient() {
  const [movements, setMovements] = useState<StoreMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMovements(await fetchStoreMovements());
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
      <PageHeader title="Stock Ledger" description="Audit trail of receipts, issues, adjustments, and transfers." />
      <Card className="overflow-x-auto p-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading movements…</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-slate-500">No stock movements yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">When</th>
                <th className="pb-2 pr-4">Item</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Qty Δ</th>
                <th className="pb-2 pr-4">Balance</th>
                <th className="pb-2 pr-4">Reference</th>
                <th className="pb-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="py-2 pr-4 text-slate-500">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-medium">{m.itemName ?? m.itemId}</td>
                  <td className="py-2 pr-4 capitalize">{m.movementType}</td>
                  <td className={`py-2 pr-4 font-semibold ${m.qtyDelta < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {m.qtyDelta > 0 ? "+" : ""}{m.qtyDelta}
                  </td>
                  <td className="py-2 pr-4">{m.qtyAfter}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {m.referenceType ? `${m.referenceType}:${m.referenceId}` : "—"}
                    {m.department ? ` · ${m.department}` : ""}
                  </td>
                  <td className="py-2">{m.actorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
