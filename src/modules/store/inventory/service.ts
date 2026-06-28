import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapStoreItem } from "@/modules/store/mappers";
import type { StoreItem } from "@/modules/store/types";

function deriveStatus(qty: number, reorder: number): StoreItem["status"] {
  if (qty <= 0) return "Out of Stock";
  if (qty <= reorder * 0.3) return "Critical";
  if (qty <= reorder) return "Low Stock";
  return "OK";
}

export async function listStoreItems(): Promise<StoreItem[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("store_items")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("name");

  if (error) {
    console.error("[listStoreItems]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapStoreItem(row as Record<string, unknown>));
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
}): Promise<StoreItem | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const id = input.id ?? `STR-${Date.now()}`;
  const stock = input.currentStock ?? 0;
  const payload = {
    id,
    hospital_id: scoped.hospitalId,
    name: input.name.trim(),
    category: input.category,
    form: input.form ?? null,
    unit: input.unit,
    current_stock: stock,
    reorder_level: input.reorderLevel,
    unit_cost: input.unitCost ?? 0,
    supplier: input.supplier ?? null,
    status: deriveStatus(stock, input.reorderLevel),
    legacy_inventory_id: id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await scoped.admin
    .from("store_items")
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("[upsertStoreItem]", error.message);
    return { error: error.message };
  }

  // Mirror legacy store_inventory for pharmacy links
  await scoped.admin.from("store_inventory").upsert({
    id,
    hospital_id: scoped.hospitalId,
    name: payload.name,
    category: payload.category,
    form: payload.form,
    unit: payload.unit,
    qty: Math.round(stock),
    reorder: Math.round(input.reorderLevel),
    unit_cost: payload.unit_cost,
    supplier: payload.supplier,
    status: payload.status === "OK" ? "In Stock" : payload.status,
    updated_at: payload.updated_at,
  });

  return mapStoreItem(data as Record<string, unknown>);
}

export async function adjustStoreItemStock(input: {
  itemId: string;
  qtyDelta: number;
  notes?: string;
  actorId?: string;
  actorName: string;
}): Promise<{ movementId: string; qtyAfter: number } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("store_post_movement", {
    p_hospital_id: scoped.hospitalId,
    p_item_id: input.itemId,
    p_qty_delta: input.qtyDelta,
    p_movement_type: "adjustment",
    p_reference_type: "adjustment",
    p_reference_id: null,
    p_department: null,
    p_notes: input.notes ?? "Manual stock adjustment",
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName,
  });

  if (error) {
    console.error("[adjustStoreItemStock]", error.message);
    return { error: error.message };
  }

  const payload = data as { movementId?: string; qtyAfter?: number };
  return {
    movementId: String(payload.movementId ?? ""),
    qtyAfter: Number(payload.qtyAfter ?? 0),
  };
}
