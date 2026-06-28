import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { listStoreItems } from "@/modules/store/inventory/service";
import { listStoreMovements } from "@/modules/store/movements/service";
import { listRequisitions } from "@/modules/store/requisitions/service";
import { listPurchaseOrders } from "@/modules/store/procurement/service";
import type { StoreDashboardSummary, StoreReportSummary } from "@/modules/store/types";

export async function getStoreDashboard(): Promise<StoreDashboardSummary> {
  const [items, requisitions, orders, movements] = await Promise.all([
    listStoreItems(),
    listRequisitions(),
    listPurchaseOrders(),
    listStoreMovements({ limit: 8 }),
  ]);

  const stockAlerts = items.filter((i) => i.status !== "OK");
  const criticalStock = items.filter((i) => i.status === "Critical" || i.status === "Out of Stock");
  const openRequisitions = requisitions.filter((r) =>
    ["submitted", "approved", "partially_issued"].includes(r.status),
  );
  const pendingApprovalPos = orders.filter((o) => o.status === "pending_approval");
  const ordersInProgress = orders.filter((o) =>
    !["received", "cancelled", "rejected"].includes(o.status),
  );

  return {
    totalSkus: items.length,
    stockAlerts: stockAlerts.length,
    criticalStock: criticalStock.length,
    openRequisitions: openRequisitions.length,
    pendingApprovalPos: pendingApprovalPos.length,
    ordersInProgress: ordersInProgress.length,
    recentMovements: movements,
    recentRequisitions: requisitions.slice(0, 8),
    lowStockItems: stockAlerts.slice(0, 8),
  };
}

export async function getStoreReports(): Promise<StoreReportSummary> {
  const scoped = await createTenantAdminClient();
  const items = await listStoreItems();
  const stockValue = items.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0);

  if (!scoped) {
    return {
      totalSkus: items.length,
      stockValue,
      issuesThisMonth: 0,
      receiptsThisMonth: 0,
      topIssued: [],
      lowStock: items.filter((i) => i.status !== "OK").slice(0, 10),
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: movements } = await scoped.admin
    .from("store_stock_movements")
    .select("movement_type, qty_delta, item_id")
    .eq("hospital_id", scoped.hospitalId)
    .gte("created_at", monthStart.toISOString());

  let issuesThisMonth = 0;
  let receiptsThisMonth = 0;
  const issueByItem = new Map<string, number>();

  for (const row of movements ?? []) {
    const type = String(row.movement_type);
    const qty = Math.abs(Number(row.qty_delta ?? 0));
    if (type === "issue") {
      issuesThisMonth += qty;
      const itemId = String(row.item_id);
      issueByItem.set(itemId, (issueByItem.get(itemId) ?? 0) + qty);
    }
    if (type === "receipt") receiptsThisMonth += qty;
  }

  const nameMap = new Map(items.map((i) => [i.id, i.name]));
  const topIssued = [...issueByItem.entries()]
    .map(([itemId, qty]) => ({ itemName: nameMap.get(itemId) ?? itemId, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return {
    totalSkus: items.length,
    stockValue,
    issuesThisMonth,
    receiptsThisMonth,
    topIssued,
    lowStock: items.filter((i) => i.status !== "OK").slice(0, 10),
  };
}
