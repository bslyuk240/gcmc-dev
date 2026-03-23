"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { fetchStoreInventory, fetchStorePOs } from "@/lib/supabase/db";
import type { StoreInventoryItem } from "@/lib/supabase/db";
import type { StorePO } from "@/lib/data/admin-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "In Stock":  "bg-emerald-50 text-emerald-700",
  "Low Stock": "bg-amber-50  text-amber-700",
  "Critical":  "bg-orange-50 text-orange-700",
  "Out of Stock": "bg-red-50 text-red-700",
};

const PO_STATUS_COLORS: Record<string, string> = {
  Draft:     "bg-slate-100 text-slate-600",
  Sent:      "bg-blue-50   text-blue-700",
  Confirmed: "bg-violet-50 text-violet-700",
  Received:  "bg-emerald-50 text-emerald-700",
};

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo && d <= now;
}

function fmt(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function StoreDashboardPage() {
  const [inventory, setInventory] = useState<StoreInventoryItem[]>([]);
  const [pos, setPos] = useState<StorePO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStoreInventory(), fetchStorePOs()])
      .then(([inv, poList]) => {
        setInventory(inv);
        setPos(poList);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── KPI derivations ──────────────────────────────────────────────────────
  const totalSKUs    = inventory.length;
  const alertItems   = inventory.filter((i) => i.status !== "In Stock");
  const inProgressPOs = pos.filter((p) => p.status !== "Received");
  const ordersThisWeek = pos.filter((p) => isThisWeek(p.requestedAt)).length;

  const kpis = [
    {
      label: "Total SKUs",
      value: loading ? "—" : String(totalSKUs),
      sub: "Active items",
      color: "text-slate-900",
      bar: "bg-slate-900",
    },
    {
      label: "Low / Out of Stock",
      value: loading ? "—" : String(alertItems.length),
      sub: alertItems.length > 0 ? "Needs attention" : "All in stock",
      color: alertItems.length > 0 ? "text-red-600" : "text-emerald-600",
      bar: alertItems.length > 0 ? "bg-red-500" : "bg-emerald-500",
    },
    {
      label: "Orders in Progress",
      value: loading ? "—" : String(inProgressPOs.length),
      sub: "Pending / active POs",
      color: "text-amber-600",
      bar: "bg-amber-500",
    },
    {
      label: "Orders This Week",
      value: loading ? "—" : String(ordersThisWeek),
      sub: "Procurement orders",
      color: "text-emerald-600",
      bar: "bg-emerald-500",
    },
  ];

  // ── Stock alerts (critical / out-of-stock items) ─────────────────────────
  const criticalItems = inventory
    .filter((i) => i.status === "Out of Stock" || i.status === "Critical")
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Store Dashboard"
        description="Inventory overview, pending stock requests, and procurement status."
      />

      {/* ── KPIs ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
            <div className={`mt-2 h-1 w-8 rounded-full ${k.bar}`} />
            <p className={`mt-2 text-2xl font-bold sm:text-3xl ${k.color}`}>{k.value}</p>
            <p className="mt-1 text-sm text-slate-500">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Purchase Orders in Progress ──────────────────────────────── */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Purchase Orders in Progress</h3>
              <Link
                href={`${INTERNAL_PREFIX}/store/procurement`}
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                All orders →
              </Link>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : inProgressPOs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">No active purchase orders.</p>
                <p className="mt-1 text-xs text-slate-400">
                  Orders will appear here once raised in Procurement.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 px-4 py-4 md:hidden">
                  {inProgressPOs.slice(0, 5).map((po) => (
                    <div key={po.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{po.supplier}</p>
                          <p className="text-xs text-slate-500">
                            {po.items} item{po.items !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${PO_STATUS_COLORS[po.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {po.status}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <MobileMeta label="Value" value={fmt(po.value)} />
                        <MobileMeta
                          label="Expected"
                          value={po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Supplier", "Items", "Total Value", "Expected", "Status"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inProgressPOs.slice(0, 5).map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{po.supplier}</td>
                        <td className="px-5 py-3 text-slate-600">{po.items} item{po.items !== 1 ? "s" : ""}</td>
                        <td className="px-5 py-3 font-semibold text-slate-900">{fmt(po.value)}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PO_STATUS_COLORS[po.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {po.status}
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

          {/* ── Recent Stock Requests ─────────────────────────────────────── */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Stock Requests</h3>
              <Link
                href={`${INTERNAL_PREFIX}/store/requests`}
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                All requests →
              </Link>
            </div>
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">Manage all stock requests here.</p>
              <p className="mt-1 text-xs text-slate-400">
                View and action general and pharmacy resupply requests.
              </p>
              <Link
                href={`${INTERNAL_PREFIX}/store/requests`}
                className="mt-4 inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Go to Requests →
              </Link>
            </div>
          </Card>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="font-bold text-slate-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: "Inventory",    href: `${INTERNAL_PREFIX}/store/inventory` },
                { label: "Requests",     href: `${INTERNAL_PREFIX}/store/requests` },
                { label: "Procurement",  href: `${INTERNAL_PREFIX}/store/procurement` },
                { label: "Chat to IT",   href: `${INTERNAL_PREFIX}/store/chat` },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-4 text-center text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  {a.label}
                </Link>
              ))}
            </div>
          </Card>

          {/* Stock Alerts */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">Stock Alerts</h3>
              {!loading && criticalItems.length > 0 && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                  {criticalItems.length} item{criticalItems.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : criticalItems.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-sm font-medium text-emerald-600">✓ All items in stock</p>
                <p className="mt-0.5 text-xs text-slate-400">No critical or out-of-stock items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.qty} {item.unit} remaining</p>
                    </div>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLORS[item.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                {alertItems.length > criticalItems.length && (
                  <Link
                    href={`${INTERNAL_PREFIX}/store/inventory`}
                    className="block text-center text-xs font-semibold text-[var(--accent)] hover:underline pt-1"
                  >
                    +{alertItems.length - criticalItems.length} more low-stock items →
                  </Link>
                )}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
