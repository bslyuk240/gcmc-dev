"use client";

import { notifyStoreUpdated, STORE_UPDATED_EVENT } from "@/lib/constants/store-events";
import type {
  GoodsReceipt,
  PurchaseOrder,
  StoreDashboardSummary,
  StoreItem,
  StoreMovement,
  StoreReportSummary,
  StoreRequisition,
  StoreSupplier,
} from "@/modules/store/types";

export { STORE_UPDATED_EVENT };

async function parseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? "Request failed.");
}

export async function fetchStoreItems(): Promise<StoreItem[]> {
  const res = await fetch("/api/store/items");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.items as StoreItem[];
}

export async function upsertStoreItem(input: {
  id?: string;
  name: string;
  category: string;
  form?: string;
  unit: string;
  currentStock?: number;
  reorderLevel: number;
  unitCost?: number;
  supplier?: string;
}): Promise<StoreItem> {
  const res = await fetch("/api/store/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return data.item as StoreItem;
}

export async function adjustStoreStock(input: {
  itemId: string;
  qtyDelta: number;
  notes?: string;
}): Promise<void> {
  const res = await fetch("/api/store/items", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function fetchStoreMovements(itemId?: string): Promise<StoreMovement[]> {
  const params = itemId ? `?itemId=${encodeURIComponent(itemId)}` : "";
  const res = await fetch(`/api/store/movements${params}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.movements as StoreMovement[];
}

export async function fetchStoreRequisitions(filter?: {
  department?: string;
  status?: string;
}): Promise<StoreRequisition[]> {
  const params = new URLSearchParams();
  if (filter?.department) params.set("department", filter.department);
  if (filter?.status) params.set("status", filter.status);
  const res = await fetch(`/api/store/requisitions?${params.toString()}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.requisitions as StoreRequisition[];
}

export async function submitStoreRequisition(input: {
  id: string;
  department: string;
  requestedBy: string;
  urgency: string;
  notes?: string;
  lines: {
    itemName: string;
    qty: number;
    unit: string;
    itemId?: string;
    lineType?: "catalog" | "non_catalog";
    justification?: string;
  }[];
}): Promise<StoreRequisition> {
  const res = await fetch("/api/store/requisitions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return data.requisition as StoreRequisition;
}

export async function updateStoreRequisitionStatus(input: {
  requisitionId: string;
  status: string;
  notes?: string;
}): Promise<void> {
  const res = await fetch(`/api/store/requisitions/${encodeURIComponent(input.requisitionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: input.status, notes: input.notes }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function issueStoreRequisition(input: {
  requisitionId: string;
  issues: { lineId: string; qty: number }[];
}): Promise<void> {
  const res = await fetch(`/api/store/requisitions/${encodeURIComponent(input.requisitionId)}/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issues: input.issues }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function linkRequisitionLine(input: { lineId: string; itemId: string }): Promise<void> {
  const res = await fetch(`/api/store/requisitions/lines/${encodeURIComponent(input.lineId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "link", itemId: input.itemId }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function createCatalogFromLine(input: {
  lineId: string;
  category?: string;
  reorderLevel?: number;
}): Promise<{ itemId: string }> {
  const res = await fetch(`/api/store/requisitions/lines/${encodeURIComponent(input.lineId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_catalog", ...input }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return { itemId: String(data.itemId ?? "") };
}

export async function markLineProcurement(input: {
  lineId: string;
  requisitionId: string;
  createPo?: boolean;
}): Promise<{ poId?: string }> {
  const res = await fetch(`/api/store/requisitions/lines/${encodeURIComponent(input.lineId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "procure", ...input }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return { poId: data.poId ? String(data.poId) : undefined };
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const res = await fetch("/api/store/procurement/orders");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.orders as PurchaseOrder[];
}

export async function createPurchaseOrder(input: {
  id: string;
  supplier: string;
  requestedBy: string;
  raisedBy?: string;
  expectedDate?: string;
  description?: string;
  lines: { itemName: string; qty: number; unitCost: number; unit: string; itemId?: string }[];
}): Promise<PurchaseOrder> {
  const res = await fetch("/api/store/procurement/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return data.order as PurchaseOrder;
}

export async function updatePurchaseOrderStatus(input: {
  poId: string;
  status: string;
}): Promise<void> {
  const res = await fetch(`/api/store/procurement/orders/${encodeURIComponent(input.poId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: input.status }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function submitPOPayment(poId: string, input?: { amount?: number; supplier?: string }): Promise<void> {
  const res = await fetch(`/api/store/procurement/orders/${encodeURIComponent(poId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submit_payment", amount: input?.amount, supplier: input?.supplier }),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function receiveGrn(input: {
  poId: string;
  lines: { poLineId?: string; itemId?: string; itemName?: string; qtyReceived: number; unitCost?: number }[];
  notes?: string;
}): Promise<{ grnNumber: string }> {
  const res = await fetch("/api/store/procurement/grn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
  const data = await res.json();
  return { grnNumber: String(data.grnNumber ?? "") };
}

export async function fetchGoodsReceipts(poId?: string): Promise<GoodsReceipt[]> {
  const params = poId ? `?poId=${encodeURIComponent(poId)}` : "";
  const res = await fetch(`/api/store/procurement/grn${params}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.receipts as GoodsReceipt[];
}

export async function fetchStoreSuppliers(): Promise<StoreSupplier[]> {
  const res = await fetch("/api/store/suppliers");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.suppliers as StoreSupplier[];
}

export async function createStoreSupplier(input: Omit<StoreSupplier, "id" | "createdAt">): Promise<void> {
  const res = await fetch("/api/store/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function deleteStoreSupplier(id: string): Promise<void> {
  const res = await fetch(`/api/store/suppliers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) await parseError(res);
  notifyStoreUpdated();
}

export async function fetchStoreDashboard(): Promise<StoreDashboardSummary> {
  const res = await fetch("/api/store/dashboard");
  if (!res.ok) await parseError(res);
  return res.json() as Promise<StoreDashboardSummary>;
}

export async function fetchStoreReports(): Promise<StoreReportSummary> {
  const res = await fetch("/api/store/reports");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.summary as StoreReportSummary;
}

export function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

export function displayReqStatus(status: string) {
  const map: Record<string, string> = {
    submitted: "Pending",
    approved: "Approved",
    partially_issued: "Partially Issued",
    fulfilled: "Fulfilled",
    rejected: "Rejected",
  };
  return map[status] ?? status;
}

export function displayPOStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Draft",
    pending_approval: "Pending Approval",
    approved: "Approved",
    sent: "Sent",
    confirmed: "Confirmed",
    partially_received: "Partially Received",
    received: "Received",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}
