import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import {
  displayPOStatus,
  mapGoodsReceipt,
  mapPOLine,
  mapPurchaseOrder,
  mapStoreSupplier,
} from "@/modules/store/mappers";
import type { GoodsReceipt, POStatus, PurchaseOrder, StoreSupplier } from "@/modules/store/types";

import type { SupabaseClient } from "@supabase/supabase-js";

async function loadOrdersWithLines(
  admin: SupabaseClient,
  hospitalId: string,
): Promise<PurchaseOrder[]> {
  const { data: orders, error } = await admin
    .from("store_pos")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("[loadOrdersWithLines]", error.message);
    return [];
  }

  const ids = (orders ?? []).map((o) => String(o.id));
  const { data: lines } = ids.length
    ? await admin.from("store_po_lines").select("*").eq("hospital_id", hospitalId).in("po_id", ids)
    : { data: [] };

  const linesByPo = new Map<string, ReturnType<typeof mapPOLine>[]>();
  for (const line of lines ?? []) {
    const mapped = mapPOLine(line as Record<string, unknown>);
    const bucket = linesByPo.get(mapped.poId) ?? [];
    bucket.push(mapped);
    linesByPo.set(mapped.poId, bucket);
  }

  return (orders ?? []).map((row) =>
    mapPurchaseOrder(row as Record<string, unknown>, linesByPo.get(String(row.id)) ?? []),
  );
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];
  return loadOrdersWithLines(scoped.admin, scoped.hospitalId);
}

export async function createPurchaseOrder(input: {
  id: string;
  supplier: string;
  requestedBy: string;
  raisedBy?: string;
  expectedDate?: string;
  description?: string;
  lines: { itemName: string; qty: number; unitCost: number; unit: string; itemId?: string }[];
}): Promise<PurchaseOrder | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };
  if (!input.lines.length) return { error: "Add at least one line." };

  const total = input.lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0);

  const { error: poError } = await scoped.admin.from("store_pos").insert({
    id: input.id,
    hospital_id: scoped.hospitalId,
    supplier: input.supplier,
    items: input.lines,
    value: total,
    requested_by: input.requestedBy,
    requested_at: new Date().toISOString(),
    expected_date: input.expectedDate || null,
    status: "draft",
    description: input.description ?? null,
    raised_by: input.raisedBy ?? input.requestedBy,
    payment_submitted: false,
  });

  if (poError) {
    console.error("[createPurchaseOrder]", poError.message);
    return { error: poError.message };
  }

  const lineRows = input.lines.map((line) => ({
    hospital_id: scoped.hospitalId,
    po_id: input.id,
    item_id: line.itemId ?? null,
    item_name: line.itemName,
    qty_ordered: line.qty,
    unit_cost: line.unitCost,
    unit: line.unit,
  }));

  const { error: lineError } = await scoped.admin.from("store_po_lines").insert(lineRows);
  if (lineError) {
    console.error("[createPurchaseOrder lines]", lineError.message);
    return { error: lineError.message };
  }

  const list = await loadOrdersWithLines(scoped.admin, scoped.hospitalId);
  const found = list.find((o) => o.id === input.id);
  if (!found) return { error: "PO created but not found." };
  return found;
}

export async function updatePurchaseOrderStatus(input: {
  poId: string;
  status: POStatus;
}): Promise<{ poId: string; status: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { error } = await scoped.admin
    .from("store_pos")
    .update({ status: displayPOStatus(input.status), updated_at: new Date().toISOString() })
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", input.poId);

  if (error) {
    console.error("[updatePurchaseOrderStatus]", error.message);
    return { error: error.message };
  }

  return { poId: input.poId, status: input.status };
}

export async function markPOPaymentSubmitted(poId: string): Promise<void> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return;
  await scoped.admin
    .from("store_pos")
    .update({ payment_submitted: true })
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", poId);
}

export async function receiveGrn(input: {
  poId: string;
  lines: { poLineId?: string; itemId?: string; itemName?: string; qtyReceived: number; unitCost?: number }[];
  notes?: string;
  actorId?: string;
  actorName: string;
}): Promise<{ grnId: string; grnNumber: string; poStatus: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };
  if (!input.lines.length) return { error: "Add receipt lines." };

  const { data, error } = await scoped.admin.rpc("store_receive_grn", {
    p_hospital_id: scoped.hospitalId,
    p_po_id: input.poId,
    p_lines: input.lines,
    p_notes: input.notes ?? null,
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName,
  });

  if (error) {
    console.error("[receiveGrn]", error.message);
    return { error: error.message };
  }

  const payload = data as { grnId?: string; grnNumber?: string; poStatus?: string };
  return {
    grnId: String(payload.grnId ?? ""),
    grnNumber: String(payload.grnNumber ?? ""),
    poStatus: String(payload.poStatus ?? ""),
  };
}

export async function listGoodsReceipts(poId?: string): Promise<GoodsReceipt[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("store_goods_receipts")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("received_at", { ascending: false });

  if (poId) query = query.eq("po_id", poId);

  const { data: grns, error } = await query;
  if (error) {
    console.error("[listGoodsReceipts]", error.message);
    return [];
  }

  const ids = (grns ?? []).map((g) => String(g.id));
  const { data: lines } = ids.length
    ? await scoped.admin.from("store_grn_lines").select("*").eq("hospital_id", scoped.hospitalId).in("grn_id", ids)
    : { data: [] };

  const linesByGrn = new Map<string, GoodsReceipt["lines"]>();
  for (const line of lines ?? []) {
    const grnId = String(line.grn_id);
    const bucket = linesByGrn.get(grnId) ?? [];
    bucket.push({
      id: String(line.id),
      itemId: line.item_id ? String(line.item_id) : undefined,
      itemName: String(line.item_name ?? ""),
      qtyReceived: Number(line.qty_received ?? 0),
      unitCost: Number(line.unit_cost ?? 0),
    });
    linesByGrn.set(grnId, bucket);
  }

  return (grns ?? []).map((row) =>
    mapGoodsReceipt(row as Record<string, unknown>, linesByGrn.get(String(row.id)) ?? []),
  );
}

export async function listSuppliers(): Promise<StoreSupplier[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("store_suppliers")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("name");

  if (error) {
    console.error("[listSuppliers]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapStoreSupplier(row as Record<string, unknown>));
}

export async function createSupplier(input: Omit<StoreSupplier, "id" | "createdAt">): Promise<StoreSupplier | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin
    .from("store_suppliers")
    .insert({
      hospital_id: scoped.hospitalId,
      name: input.name,
      category: input.category,
      contact: input.contact,
      phone: input.phone,
      lead: input.lead,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createSupplier]", error.message);
    return { error: error.message };
  }

  return mapStoreSupplier(data as Record<string, unknown>);
}

export async function deleteSupplier(id: string): Promise<{ error?: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { error } = await scoped.admin
    .from("store_suppliers")
    .delete()
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", id);

  if (error) {
    console.error("[deleteSupplier]", error.message);
    return { error: error.message };
  }
  return {};
}
