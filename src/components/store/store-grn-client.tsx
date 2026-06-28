"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Toast, type ToastData } from "@/components/ui/toast";
import {
  displayPOStatus,
  fetchGoodsReceipts,
  fetchPurchaseOrders,
  receiveGrn,
} from "@/lib/store/client";
import type { GoodsReceipt, PurchaseOrder } from "@/modules/store/types";

export function StoreGrnClient() {
  const searchParams = useSearchParams();
  const initialPo = searchParams.get("po") ?? "";
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [selectedPo, setSelectedPo] = useState(initialPo);
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, r] = await Promise.all([fetchPurchaseOrders(), fetchGoodsReceipts()]);
      setOrders(o.filter((order) => ["confirmed", "partially_received", "approved", "sent"].includes(order.status) || order.status === "received"));
      setReceipts(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const po = orders.find((o) => o.id === selectedPo);

  async function handleReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!po) return;
    const lines = po.lines.map((line) => ({
      poLineId: line.id,
      itemId: line.itemId,
      itemName: line.itemName,
      qtyReceived: parseFloat(qtyByLine[line.id] ?? "0") || 0,
      unitCost: line.unitCost,
    })).filter((l) => l.qtyReceived > 0);

    if (!lines.length) {
      setToast({ message: "Enter quantities to receive.", type: "error" });
      return;
    }

    try {
      const result = await receiveGrn({ poId: po.id, lines });
      setToast({ message: `GRN ${result.grnNumber} posted — stock increased.`, type: "success" });
      setQtyByLine({});
      await load();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "GRN failed.", type: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Goods Receipt (GRN)" description="Receive purchase order lines into store inventory with ledger entries." />

      <Card className="p-4">
        <label className="text-sm font-semibold text-slate-700">Purchase order</label>
        <select
          className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
          value={selectedPo}
          onChange={(e) => setSelectedPo(e.target.value)}
        >
          <option value="">Select PO…</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.id} · {order.supplier} · {displayPOStatus(order.status)}
            </option>
          ))}
        </select>
      </Card>

      {po && (
        <Card className="p-4">
          <form onSubmit={handleReceive} className="space-y-3">
            {po.lines.map((line) => (
              <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="text-sm">
                  <p className="font-medium text-slate-800">{line.itemName}</p>
                  <p className="text-slate-500">Ordered {line.qtyOrdered} · Received {line.qtyReceived}</p>
                </div>
                <input
                  className="w-28 rounded-lg border px-3 py-2 text-sm"
                  placeholder="Qty recv"
                  value={qtyByLine[line.id] ?? ""}
                  onChange={(e) => setQtyByLine((prev) => ({ ...prev, [line.id]: e.target.value }))}
                />
              </div>
            ))}
            <Button type="submit">Post GRN & increase stock</Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-slate-900">Recent receipts</h3>
        {loading ? <p className="text-sm text-slate-400">Loading…</p> : receipts.length === 0 ? (
          <p className="text-sm text-slate-500">No GRNs yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {receipts.slice(0, 10).map((grn) => (
              <li key={grn.id} className="rounded-lg bg-slate-50 px-3 py-2">
                {grn.grnNumber} · PO {grn.poId} · {new Date(grn.receivedAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
