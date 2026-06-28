"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdminPageHeader, AdminKpiCard, AdminStatusBadge, AdminCardTitle } from "@/components/admin/admin-ui";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { usePharmacyStore } from "@/lib/hooks/use-pharmacy-store";

const TABS = ["All Inventory", "Pharmacy", "Store", "Lab Supplies"] as const;

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Inventory");
  const { storeItems, storePOs, metrics } = useAdminStore();
  const { restockRequests, metrics: rxMetrics } = usePharmacyStore();

  const pharmacyRows = restockRequests.map((item) => ({
    name: item.drug,
    category: "Pharmacy",
    stock: item.currentStock ?? 0,
    unit: "units",
    minStock: item.reorderLevel ?? 10,
    status: item.urgency === "Critical" ? "Critical" : item.status === "Pending" ? "Low Stock" : "OK",
    expiry: "—",
  }));

  const storeRows = storeItems.map((item) => ({
    name: item.name,
    category: item.category ?? "Store",
    stock: item.currentStock,
    unit: item.unit ?? "units",
    minStock: item.reorderLevel ?? 5,
    status: item.status,
    expiry: "—",
  }));

  const allRows = [...pharmacyRows, ...storeRows];
  const rows =
    tab === "Pharmacy" ? pharmacyRows :
    tab === "Store" ? storeRows :
    tab === "Lab Supplies" ? storeRows.filter((r) => r.category.toLowerCase().includes("lab")) :
    allRows;

  const lowStock = allRows.filter((r) => r.status === "Low Stock" || r.status === "Critical").length;
  const critical = allRows.filter((r) => r.status === "Critical" || r.status === "Out of Stock").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory Overview"
        subtitle="Stock levels across pharmacy, store, and lab supplies."
        action={
          <Link href="/app/admin/store" className="text-sm font-semibold text-indigo-600 hover:underline">
            Store monitor →
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Total Items" value={allRows.length} />
        <AdminKpiCard label="Low Stock Items" value={lowStock + rxMetrics.pendingRestocks} />
        <AdminKpiCard label="Critical / OOS" value={critical + metrics.criticalStock} />
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-none px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {metrics.pendingPOs > 0 && (
        <div className="flex items-center gap-3 rounded-none border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm font-semibold text-amber-800">
            {metrics.pendingPOs} purchase order{metrics.pendingPOs > 1 ? "s" : ""} awaiting approval (₦{metrics.pendingPOValue.toLocaleString()})
          </span>
          <Link href="/app/admin/store" className="ml-auto text-xs font-semibold text-amber-700 hover:underline">
            Review POs →
          </Link>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <AdminCardTitle title={`${tab} (${rows.length} items)`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Current Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Min. Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={`${row.name}-${i}`} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{row.name}</td>
                  <td className="px-5 py-3 text-slate-600">{row.category}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.stock}</td>
                  <td className="px-5 py-3 text-slate-600">{row.unit}</td>
                  <td className="px-5 py-3 text-slate-600">{row.minStock}</td>
                  <td className="px-5 py-3">
                    <AdminStatusBadge
                      status={
                        row.status === "OK" || row.status === "Good" ? "Good" :
                        row.status === "Low Stock" ? "Warning" : "Critical"
                      }
                    />
                  </td>
                  <td className="px-5 py-3 text-slate-600">{row.expiry}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">No inventory items in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {storePOs.filter((p) => p.status === "Pending Approval").length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-800">Pending purchase orders</h3>
          <ul className="mt-3 space-y-2">
            {storePOs.filter((p) => p.status === "Pending Approval").slice(0, 5).map((po) => (
              <li key={po.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{po.id} — {po.supplier}</span>
                <span className="font-semibold text-slate-900">₦{po.value.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
