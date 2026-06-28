import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapStoreMovement } from "@/modules/store/mappers";
import type { StoreMovement } from "@/modules/store/types";

export async function listStoreMovements(input?: {
  itemId?: string;
  limit?: number;
}): Promise<StoreMovement[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("store_stock_movements")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 100);

  if (input?.itemId) query = query.eq("item_id", input.itemId);

  const { data, error } = await query;
  if (error) {
    console.error("[listStoreMovements]", error.message);
    return [];
  }

  const itemIds = [...new Set((data ?? []).map((row) => String(row.item_id)))];
  const { data: items } = await scoped.admin
    .from("store_items")
    .select("id, name")
    .eq("hospital_id", scoped.hospitalId)
    .in("id", itemIds.length ? itemIds : ["__none__"]);

  const nameMap = new Map((items ?? []).map((i) => [String(i.id), String(i.name)]));

  return (data ?? []).map((row) =>
    mapStoreMovement(row as Record<string, unknown>, nameMap.get(String(row.item_id))),
  );
}
