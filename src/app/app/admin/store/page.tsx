"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Toast, type ToastData } from "@/components/ui/toast";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { updatePOStatus } from "@/lib/data/admin-store";

const STOCK_STYLES: Record<string, string> = {
  OK: "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700 font-bold",
  "Out of Stock": "bg-slate-100 text-slate-500",
};

const PO_STATUS_STYLES: Record<string, string> = {
  "Pending Approval": "bg-amber-50 text-amber-700",
  Approved: "bg-violet-50 text-violet-700",
  Sent: "bg-sky-50 text-sky-700",
  Received: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-red-50 text-red-700",
  Draft: "bg-slate-100 text-slate-600",
};

export default function AdminStoreMonitorPage() {
  const { storeItems, storePOs, metrics } = useAdminStore();
  const [approvePO, setApprovePO] = useState<string | null>(null);
  const [rejectPO, setRejectPO] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const alertItems = storeItems.filter((i) => i.status !== "OK");
  const pendingPOs = storePOs.filter((p) => p.status === "Pending Approval");
  const targetPO = storePOs.find((p) => p.id === (approvePO ?? rejectPO));

  function handleApprove() {
    if (!approvePO) return;
    updatePOStatus(approvePO, "Approved");
    setToast({ message: `Purchase Order ${approvePO} approved.`, type: "success" });
    setApprovePO(null);
  }

  function handleReject() {
    if (!rejectPO) return;
    updatePOStatus(rejectPO, "Rejected");
    setToast({ message: `Purchase Order ${rejectPO} rejected.`, type: "info" });
    setRejectPO(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Store Monitor" description="Procurement oversight — stock levels, purchase orders, supply alerts, and approval of major purchases." />
        <Link href={`${INTERNAL_PREFIX}/store`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
          Open Store →
        </Link>
      </div>

      {metrics.criticalStock > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm font-bold text-red-800">
            {metrics.criticalStock} item{metrics.criticalStock > 1 ? "s" : ""} critically low or out of stock — immediate procurement action needed.
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {[
          { label: "Stock Alerts", value: metrics.stockAlerts, color: metrics.stockAlerts > 0 ? "text-amber-600" : "text-emerald-700" },
          { label: "Critical / OOS", value: metrics.criticalStock, color: metrics.criticalStock > 0 ? "text-red-700" : "text-slate-500" },
          { label: "POs Awaiting Approval", value: metrics.pendingPOs, color: metrics.pendingPOs > 0 ? "text-violet-700" : "text-slate-500" },
          { label: "PO Value Pending", value: `₦${metrics.pendingPOValue.toLocaleString()}`, color: "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="flex flex-1 items-center gap-3 px-4 py-3">
            <p className={`text-xl font-bold shrink-0 ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 leading-tight">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* POs awaiting approval */}
          {pendingPOs.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                <h3 className="font-bold text-amber-900">Purchase Orders — Awaiting Admin Approval</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {pendingPOs.map((po) => (
                  <div key={po.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{po.id}</p>
                        <span className="text-xs text-slate-400">·</span>
                        <p className="text-sm text-slate-700">{po.supplier}</p>
                      </div>
                      <p className="text-xs text-slate-500">{po.items} items · Requested by {po.requestedBy} · Expected {po.expectedDate}</p>
                    </div>
                    <div className="text-right shrink-0 mr-3">
                      <p className="font-bold text-slate-900">₦{po.value.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => setApprovePO(po.id)}>Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRejectPO(po.id)}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Stock alerts */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">Stock Level Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Item", "Category", "Stock", "Reorder At", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50 ${item.status === "Out of Stock" ? "bg-slate-50/40" : ""}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${item.status === "OK" ? "text-emerald-700" : item.status === "Out of Stock" ? "text-slate-400" : "text-red-700"}`}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{item.reorderLevel} {item.unit}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STOCK_STYLES[item.status]}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* All POs */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-900">All Purchase Orders</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {storePOs.map((po) => (
                <div key={po.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{po.id} — {po.supplier}</p>
                    <p className="text-xs text-slate-400">{po.items} items · ₦{po.value.toLocaleString()} · Expected {po.expectedDate}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PO_STATUS_STYLES[po.status]}`}>{po.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-slate-900 mb-3">Admin Insight</h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />{metrics.criticalStock} items critical or out of stock.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{metrics.stockAlerts} items total with stock alerts.</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />{metrics.pendingPOs} PO{metrics.pendingPOs !== 1 ? "s" : ""} awaiting admin approval (₦{metrics.pendingPOValue.toLocaleString()}).</li>
            </ul>
          </Card>
          <Link href={`${INTERNAL_PREFIX}/store/procurement`}
            className="block rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 text-center transition">
            Procurement →
          </Link>
          <Link href={`${INTERNAL_PREFIX}/store/inventory`}
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center transition">
            Full Inventory →
          </Link>
        </div>
      </div>

      <Modal open={!!approvePO} onClose={() => setApprovePO(null)} title="Approve Purchase Order">
        {targetPO && <p className="text-sm text-slate-700">Approve <strong>{targetPO.id}</strong> from <strong>{targetPO.supplier}</strong> for <strong>₦{targetPO.value.toLocaleString()}</strong>?</p>}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setApprovePO(null)}>Cancel</Button>
          <Button size="md" onClick={handleApprove}>Approve PO</Button>
        </ModalFooter>
      </Modal>

      <Modal open={!!rejectPO} onClose={() => setRejectPO(null)} title="Reject Purchase Order">
        {targetPO && <p className="text-sm text-slate-700">Reject <strong>{targetPO.id}</strong> from <strong>{targetPO.supplier}</strong>? The Store team will be notified.</p>}
        <ModalFooter>
          <Button variant="ghost" size="md" onClick={() => setRejectPO(null)}>Cancel</Button>
          <Button size="md" onClick={handleReject}>Reject PO</Button>
        </ModalFooter>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
