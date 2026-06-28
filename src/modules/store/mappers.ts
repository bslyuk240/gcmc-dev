import type {
  GoodsReceipt,
  POLine,
  PurchaseOrder,
  RequisitionLine,
  StoreItem,
  StoreMovement,
  StoreRequisition,
  StoreSupplier,
} from "@/modules/store/types";

export function mapStoreItem(row: Record<string, unknown>): StoreItem {
  return {
    id: String(row.id ?? ""),
    hospitalId: String(row.hospital_id ?? ""),
    name: String(row.name ?? ""),
    category: String(row.category ?? "General"),
    form: row.form ? String(row.form) : undefined,
    unit: String(row.unit ?? "Units"),
    currentStock: Number(row.current_stock ?? 0),
    reorderLevel: Number(row.reorder_level ?? 10),
    unitCost: Number(row.unit_cost ?? 0),
    supplier: row.supplier ? String(row.supplier) : undefined,
    status: (row.status as StoreItem["status"]) ?? "OK",
    legacyInventoryId: row.legacy_inventory_id ? String(row.legacy_inventory_id) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapStoreMovement(row: Record<string, unknown>, itemName?: string): StoreMovement {
  return {
    id: String(row.id ?? ""),
    itemId: String(row.item_id ?? ""),
    itemName,
    movementType: row.movement_type as StoreMovement["movementType"],
    qtyDelta: Number(row.qty_delta ?? 0),
    qtyAfter: Number(row.qty_after ?? 0),
    referenceType: row.reference_type ? String(row.reference_type) : undefined,
    referenceId: row.reference_id ? String(row.reference_id) : undefined,
    department: row.department ? String(row.department) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    actorName: String(row.actor_name ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapRequisitionLine(row: Record<string, unknown>): RequisitionLine {
  return {
    id: String(row.id ?? ""),
    requisitionId: String(row.requisition_id ?? ""),
    itemId: row.item_id ? String(row.item_id) : undefined,
    itemName: String(row.item_name ?? ""),
    qtyRequested: Number(row.qty_requested ?? 0),
    qtyIssued: Number(row.qty_issued ?? 0),
    unit: String(row.unit ?? "Units"),
    lineType: (row.line_type as RequisitionLine["lineType"]) ?? (row.item_id ? "catalog" : "non_catalog"),
    lineStatus: (row.line_status as RequisitionLine["lineStatus"]) ?? "pending",
    justification: row.justification ? String(row.justification) : undefined,
    storeInventoryId: row.store_inventory_id ? String(row.store_inventory_id) : undefined,
    pharmacyInventoryId: row.pharmacy_inventory_id ? String(row.pharmacy_inventory_id) : undefined,
  };
}

export function mapRequisition(row: Record<string, unknown>, lines: RequisitionLine[] = []): StoreRequisition {
  return {
    id: String(row.id ?? ""),
    requisitionType: (row.requisition_type as StoreRequisition["requisitionType"]) ?? "general",
    department: String(row.department ?? ""),
    requestedBy: String(row.requested_by ?? ""),
    urgency: String(row.urgency ?? "Routine"),
    status: (row.status as StoreRequisition["status"]) ?? "submitted",
    notes: row.notes ? String(row.notes) : undefined,
    pharmacyRestockId: row.pharmacy_restock_id ? String(row.pharmacy_restock_id) : undefined,
    fulfilledAt: row.fulfilled_at ? String(row.fulfilled_at) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    lines,
  };
}

export function mapPOLine(row: Record<string, unknown>): POLine {
  return {
    id: String(row.id ?? ""),
    poId: String(row.po_id ?? ""),
    itemId: row.item_id ? String(row.item_id) : undefined,
    itemName: String(row.item_name ?? ""),
    qtyOrdered: Number(row.qty_ordered ?? 0),
    qtyReceived: Number(row.qty_received ?? 0),
    unitCost: Number(row.unit_cost ?? 0),
    unit: String(row.unit ?? "Units"),
  };
}

export function normalizePOStatus(status: string): PurchaseOrder["status"] {
  const s = status.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, PurchaseOrder["status"]> = {
    draft: "draft",
    pending_approval: "pending_approval",
    approved: "approved",
    sent: "sent",
    confirmed: "confirmed",
    partially_received: "partially_received",
    received: "received",
    rejected: "rejected",
    cancelled: "cancelled",
  };
  return map[s] ?? "draft";
}

export function displayPOStatus(status: PurchaseOrder["status"]): string {
  const map: Record<PurchaseOrder["status"], string> = {
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

export function mapPurchaseOrder(row: Record<string, unknown>, lines: POLine[] = []): PurchaseOrder {
  return {
    id: String(row.id ?? ""),
    supplier: String(row.supplier ?? ""),
    value: Number(row.value ?? 0),
    requestedBy: String(row.requested_by ?? ""),
    requestedAt: String(row.requested_at ?? row.created_at ?? ""),
    expectedDate: row.expected_date ? String(row.expected_date) : undefined,
    status: normalizePOStatus(String(row.status ?? "draft")),
    description: row.description ? String(row.description) : undefined,
    paymentSubmitted: Boolean(row.payment_submitted),
    raisedBy: row.raised_by ? String(row.raised_by) : undefined,
    lines,
  };
}

export function mapStoreSupplier(row: Record<string, unknown>): StoreSupplier {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    category: String(row.category ?? "General Supplies"),
    contact: String(row.contact ?? ""),
    phone: String(row.phone ?? ""),
    lead: String(row.lead ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapGoodsReceipt(
  row: Record<string, unknown>,
  lines: GoodsReceipt["lines"],
): GoodsReceipt {
  return {
    id: String(row.id ?? ""),
    grnNumber: String(row.grn_number ?? ""),
    poId: String(row.po_id ?? ""),
    receivedByName: String(row.received_by_name ?? ""),
    notes: row.notes ? String(row.notes) : undefined,
    receivedAt: String(row.received_at ?? ""),
    lines,
  };
}
