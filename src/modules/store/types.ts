export type StoreItemStatus = "OK" | "Low Stock" | "Critical" | "Out of Stock";

export type StoreMovementType = "receipt" | "issue" | "adjustment" | "transfer" | "return";

export type RequisitionStatus = "submitted" | "approved" | "partially_issued" | "fulfilled" | "rejected";

export type RequisitionType = "general" | "pharmacy_restock";

export type POStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "confirmed"
  | "partially_received"
  | "received"
  | "rejected"
  | "cancelled";

export type StoreItem = {
  id: string;
  hospitalId: string;
  name: string;
  category: string;
  form?: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  supplier?: string;
  status: StoreItemStatus;
  legacyInventoryId?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreMovement = {
  id: string;
  itemId: string;
  itemName?: string;
  movementType: StoreMovementType;
  qtyDelta: number;
  qtyAfter: number;
  referenceType?: string;
  referenceId?: string;
  department?: string;
  notes?: string;
  actorName: string;
  createdAt: string;
};

export type RequisitionLineType = "catalog" | "non_catalog";

export type RequisitionLineStatus = "pending" | "issued" | "procurement";

export type RequisitionLine = {
  id: string;
  requisitionId: string;
  itemId?: string;
  itemName: string;
  qtyRequested: number;
  qtyIssued: number;
  unit: string;
  lineType: RequisitionLineType;
  lineStatus: RequisitionLineStatus;
  justification?: string;
  storeInventoryId?: string;
  pharmacyInventoryId?: string;
};

export type StoreRequisition = {
  id: string;
  requisitionType: RequisitionType;
  department: string;
  requestedBy: string;
  urgency: string;
  status: RequisitionStatus;
  notes?: string;
  pharmacyRestockId?: string;
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
  lines: RequisitionLine[];
};

export type POLine = {
  id: string;
  poId: string;
  itemId?: string;
  itemName: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitCost: number;
  unit: string;
};

export type PurchaseOrder = {
  id: string;
  supplier: string;
  value: number;
  requestedBy: string;
  requestedAt: string;
  expectedDate?: string;
  status: POStatus;
  description?: string;
  paymentSubmitted: boolean;
  raisedBy?: string;
  lines: POLine[];
};

export type StoreSupplier = {
  id: string;
  name: string;
  category: string;
  contact: string;
  phone: string;
  lead: string;
  createdAt: string;
};

export type GoodsReceipt = {
  id: string;
  grnNumber: string;
  poId: string;
  receivedByName: string;
  notes?: string;
  receivedAt: string;
  lines: {
    id: string;
    itemId?: string;
    itemName: string;
    qtyReceived: number;
    unitCost: number;
  }[];
};

export type StoreDashboardSummary = {
  totalSkus: number;
  stockAlerts: number;
  criticalStock: number;
  openRequisitions: number;
  pendingApprovalPos: number;
  ordersInProgress: number;
  recentMovements: StoreMovement[];
  recentRequisitions: StoreRequisition[];
  lowStockItems: StoreItem[];
};

export type StoreReportSummary = {
  totalSkus: number;
  stockValue: number;
  issuesThisMonth: number;
  receiptsThisMonth: number;
  topIssued: { itemName: string; qty: number }[];
  lowStock: StoreItem[];
};
