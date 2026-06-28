import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapRequisition, mapRequisitionLine } from "@/modules/store/mappers";
import type { RequisitionStatus, StoreRequisition } from "@/modules/store/types";

import type { SupabaseClient } from "@supabase/supabase-js";

async function loadRequisitionsWithLines(
  admin: SupabaseClient,
  hospitalId: string,
  filter?: { department?: string; status?: string; type?: string },
): Promise<StoreRequisition[]> {
  let query = admin
    .from("store_requisitions")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });

  if (filter?.department) query = query.eq("department", filter.department);
  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.type) query = query.eq("requisition_type", filter.type);

  const { data: reqs, error } = await query;
  if (error) {
    console.error("[loadRequisitionsWithLines]", error.message);
    return [];
  }

  const ids = (reqs ?? []).map((r) => String(r.id));
  if (!ids.length) return [];

  const { data: lines } = await admin
    .from("store_requisition_lines")
    .select("*")
    .eq("hospital_id", hospitalId)
    .in("requisition_id", ids);

  const linesByReq = new Map<string, ReturnType<typeof mapRequisitionLine>[]>();
  for (const line of lines ?? []) {
    const mapped = mapRequisitionLine(line as Record<string, unknown>);
    const bucket = linesByReq.get(mapped.requisitionId) ?? [];
    bucket.push(mapped);
    linesByReq.set(mapped.requisitionId, bucket);
  }

  return (reqs ?? []).map((row) =>
    mapRequisition(row as Record<string, unknown>, linesByReq.get(String(row.id)) ?? []),
  );
}

export async function listRequisitions(filter?: {
  department?: string;
  status?: string;
  type?: string;
}): Promise<StoreRequisition[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];
  await syncPharmacyRestockRequests(scoped.admin, scoped.hospitalId);
  return loadRequisitionsWithLines(scoped.admin, scoped.hospitalId, filter);
}

async function syncPharmacyRestockRequests(
  admin: SupabaseClient,
  hospitalId: string,
): Promise<void> {
  const { data: restocks } = await admin
    .from("pharmacy_restock_requests")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("requested_at", { ascending: false })
    .limit(100);

  for (const row of restocks ?? []) {
    const id = String(row.id);
    const reqId = `PHR-${id}`;
    await admin.from("store_requisitions").upsert({
      id: reqId,
      hospital_id: hospitalId,
      requisition_type: "pharmacy_restock",
      department: "pharmacy",
      requested_by: String(row.requested_by ?? ""),
      urgency: String(row.urgency ?? "Routine"),
      status: publicStoreMapLegacy(String(row.status ?? "Pending")),
      pharmacy_restock_id: id,
      created_at: row.requested_at ?? row.created_at,
    }, { onConflict: "hospital_id,id", ignoreDuplicates: false });

    await admin.from("store_requisition_lines").upsert({
      hospital_id: hospitalId,
      requisition_id: reqId,
      item_name: String(row.drug ?? "Drug"),
      qty_requested: Number(row.qty_requested ?? 1),
      qty_issued: lower(String(row.status)) === "fulfilled" ? Number(row.qty_requested ?? 1) : 0,
      unit: String(row.unit ?? "Units"),
      line_type: "catalog",
      line_status: lower(String(row.status)) === "fulfilled" ? "issued" : "pending",
      store_inventory_id: row.store_inventory_id ? String(row.store_inventory_id) : null,
      pharmacy_inventory_id: row.inventory_item_id ? String(row.inventory_item_id) : null,
    }, { onConflict: "hospital_id,requisition_id,item_name", ignoreDuplicates: false });
  }
}

function lower(value: string) {
  return value.toLowerCase();
}

function publicStoreMapLegacy(status: string): RequisitionStatus {
  const map: Record<string, RequisitionStatus> = {
    pending: "submitted",
    approved: "approved",
    fulfilled: "fulfilled",
    rejected: "rejected",
  };
  return map[status.toLowerCase()] ?? "submitted";
}

export async function submitRequisition(input: {
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
  requisitionType?: "general" | "pharmacy_restock";
  pharmacyRestockId?: string;
}): Promise<StoreRequisition | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };
  if (!input.lines.length) return { error: "Add at least one line." };

  for (const line of input.lines) {
    const lineType = line.lineType ?? (line.itemId ? "catalog" : "non_catalog");
    if (lineType === "catalog" && !line.itemId) {
      return { error: "Catalog lines must select an item from the store catalog." };
    }
    if (lineType === "non_catalog" && !line.justification?.trim()) {
      return { error: "Non-catalog lines require a justification." };
    }
  }

  const { error: reqError } = await scoped.admin.from("store_requisitions").insert({
    id: input.id,
    hospital_id: scoped.hospitalId,
    requisition_type: input.requisitionType ?? "general",
    department: input.department,
    requested_by: input.requestedBy,
    urgency: input.urgency,
    status: "submitted",
    notes: input.notes ?? null,
    pharmacy_restock_id: input.pharmacyRestockId ?? null,
  });

  if (reqError) {
    console.error("[submitRequisition]", reqError.message);
    return { error: reqError.message };
  }

  const lineRows = input.lines.map((line) => {
    const lineType = line.lineType ?? (line.itemId ? "catalog" : "non_catalog");
    return {
      hospital_id: scoped.hospitalId,
      requisition_id: input.id,
      item_id: lineType === "catalog" ? line.itemId ?? null : null,
      item_name: line.itemName,
      qty_requested: line.qty,
      unit: line.unit,
      line_type: lineType,
      justification: lineType === "non_catalog" ? line.justification?.trim() ?? null : null,
      line_status: "pending",
      store_inventory_id: line.itemId ?? null,
    };
  });

  const { error: lineError } = await scoped.admin.from("store_requisition_lines").insert(lineRows);
  if (lineError) {
    console.error("[submitRequisition lines]", lineError.message);
    return { error: lineError.message };
  }

  // Legacy sync
  const primary = input.lines[0];
  await scoped.admin.from("stock_requests").upsert({
    id: input.id,
    hospital_id: scoped.hospitalId,
    item: primary.itemName,
    qty: Math.round(primary.qty),
    unit: primary.unit,
    dept: input.department,
    requested_by: input.requestedBy,
    urgency: input.urgency,
    status: "Pending",
    notes: input.notes ?? null,
  });

  const list = await loadRequisitionsWithLines(scoped.admin, scoped.hospitalId);
  const found = list.find((r) => r.id === input.id);
  if (!found) return { error: "Requisition created but not found." };
  return found;
}

export async function updateRequisitionStatus(input: {
  requisitionId: string;
  status: RequisitionStatus;
  notes?: string;
  actorId?: string;
  actorName: string;
}): Promise<{ requisitionId: string; status: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("store_update_requisition_status", {
    p_hospital_id: scoped.hospitalId,
    p_requisition_id: input.requisitionId,
    p_status: input.status,
    p_notes: input.notes ?? null,
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName,
  });

  if (error) {
    console.error("[updateRequisitionStatus]", error.message);
    return { error: error.message };
  }

  const payload = data as { requisitionId?: string; status?: string };
  return {
    requisitionId: String(payload.requisitionId ?? input.requisitionId),
    status: String(payload.status ?? input.status),
  };
}

export async function issueRequisition(input: {
  requisitionId: string;
  issues: { lineId: string; qty: number }[];
  actorId?: string;
  actorName: string;
}): Promise<{ requisitionId: string; status: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };
  if (!input.issues.length) return { error: "Select quantities to issue." };

  const { data, error } = await scoped.admin.rpc("store_issue_requisition", {
    p_hospital_id: scoped.hospitalId,
    p_requisition_id: input.requisitionId,
    p_issues: input.issues,
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName,
  });

  if (error) {
    console.error("[issueRequisition]", error.message);
    return { error: error.message };
  }

  const payload = data as { requisitionId?: string; status?: string };
  return {
    requisitionId: String(payload.requisitionId ?? input.requisitionId),
    status: String(payload.status ?? ""),
  };
}

export async function syncPharmacyRestockRequisition(input: {
  pharmacyRestockId: string;
  drug: string;
  qty: number;
  unit: string;
  requestedBy: string;
  storeInventoryId?: string;
  inventoryItemId?: string;
}): Promise<void> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return;

  const reqId = `PHR-${input.pharmacyRestockId}`;
  await scoped.admin.from("store_requisitions").upsert({
    id: reqId,
    hospital_id: scoped.hospitalId,
    requisition_type: "pharmacy_restock",
    department: "pharmacy",
    requested_by: input.requestedBy,
    urgency: "Routine",
    status: "submitted",
    pharmacy_restock_id: input.pharmacyRestockId,
  });

  await scoped.admin.from("store_requisition_lines").upsert({
    hospital_id: scoped.hospitalId,
    requisition_id: reqId,
    item_name: input.drug,
    qty_requested: input.qty,
    unit: input.unit,
    line_type: "catalog",
    line_status: "pending",
    store_inventory_id: input.storeInventoryId ?? null,
    pharmacy_inventory_id: input.inventoryItemId ?? null,
  }, { onConflict: "hospital_id,requisition_id,item_name" });
}

export async function linkRequisitionLine(input: {
  lineId: string;
  itemId: string;
}): Promise<{ lineId: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data: item } = await scoped.admin
    .from("store_items")
    .select("id, name, unit")
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", input.itemId)
    .maybeSingle();

  if (!item) return { error: "Store item not found." };

  const { error } = await scoped.admin
    .from("store_requisition_lines")
    .update({
      item_id: input.itemId,
      store_inventory_id: input.itemId,
      item_name: String(item.name),
      unit: String(item.unit),
    })
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", input.lineId);

  if (error) {
    console.error("[linkRequisitionLine]", error.message);
    return { error: error.message };
  }

  return { lineId: input.lineId };
}

export async function createCatalogFromRequisitionLine(input: {
  lineId: string;
  category?: string;
  reorderLevel?: number;
  unitCost?: number;
}): Promise<{ itemId: string; lineId: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data: line, error: lineError } = await scoped.admin
    .from("store_requisition_lines")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", input.lineId)
    .maybeSingle();

  if (lineError || !line) return { error: "Requisition line not found." };

  const itemId = `STR-${Date.now()}`;
  const { error: itemError } = await scoped.admin.from("store_items").insert({
    id: itemId,
    hospital_id: scoped.hospitalId,
    name: String(line.item_name),
    category: input.category ?? "General",
    unit: String(line.unit ?? "Units"),
    current_stock: 0,
    reorder_level: input.reorderLevel ?? 10,
    unit_cost: input.unitCost ?? 0,
    status: "Out of Stock",
    legacy_inventory_id: itemId,
  });

  if (itemError) {
    console.error("[createCatalogFromRequisitionLine]", itemError.message);
    return { error: itemError.message };
  }

  await scoped.admin.from("store_inventory").upsert({
    id: itemId,
    hospital_id: scoped.hospitalId,
    name: String(line.item_name),
    category: input.category ?? "General",
    unit: String(line.unit ?? "Units"),
    qty: 0,
    reorder: input.reorderLevel ?? 10,
    unit_cost: input.unitCost ?? 0,
    status: "Out of Stock",
  });

  const link = await linkRequisitionLine({ lineId: input.lineId, itemId });
  if ("error" in link) return link;

  return { itemId, lineId: input.lineId };
}

export async function markRequisitionLineProcurement(input: {
  lineId: string;
  requisitionId: string;
  createPo?: boolean;
  actorName?: string;
}): Promise<{ lineId: string; poId?: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data: line, error: lineError } = await scoped.admin
    .from("store_requisition_lines")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", input.lineId)
    .maybeSingle();

  if (lineError || !line) return { error: "Requisition line not found." };

  const { error } = await scoped.admin
    .from("store_requisition_lines")
    .update({ line_status: "procurement" })
    .eq("id", input.lineId);

  if (error) return { error: error.message };

  let poId: string | undefined;
  if (input.createPo) {
    const { createPurchaseOrder } = await import("@/modules/store/procurement/service");
    poId = `PO-${Date.now()}`;
    const result = await createPurchaseOrder({
      id: poId,
      supplier: "TBD — select supplier",
      requestedBy: input.actorName ?? "Store",
      description: `Procurement for non-catalog request ${input.requisitionId}: ${line.item_name}`,
      lines: [{
        itemName: String(line.item_name),
        qty: Number(line.qty_requested),
        unitCost: 0,
        unit: String(line.unit ?? "Units"),
      }],
    });
    if ("error" in result) return { error: result.error };
  }

  await recomputeRequisitionStatus(scoped.admin, scoped.hospitalId, input.requisitionId);

  return { lineId: input.lineId, poId };
}

async function recomputeRequisitionStatus(
  admin: SupabaseClient,
  hospitalId: string,
  requisitionId: string,
): Promise<void> {
  const { data: lines } = await admin
    .from("store_requisition_lines")
    .select("qty_requested, qty_issued, line_status")
    .eq("hospital_id", hospitalId)
    .eq("requisition_id", requisitionId);

  const total = lines?.length ?? 0;
  const done = (lines ?? []).filter(
    (l) => l.line_status === "procurement" || Number(l.qty_issued) >= Number(l.qty_requested),
  ).length;

  const status = total > 0 && done >= total
    ? "fulfilled"
    : done > 0
      ? "partially_issued"
      : undefined;

  if (!status) return;

  await admin
    .from("store_requisitions")
    .update({
      status,
      fulfilled_at: status === "fulfilled" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("hospital_id", hospitalId)
    .eq("id", requisitionId);

  await admin
    .from("stock_requests")
    .update({ status: status === "fulfilled" ? "Fulfilled" : "Approved" })
    .eq("hospital_id", hospitalId)
    .eq("id", requisitionId);
}
