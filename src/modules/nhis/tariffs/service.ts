import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoTariff } from "@/modules/nhis/mappers";
import type { HmoTariff } from "@/modules/nhis/types";

export async function listHmoTariffs(schemeId?: string): Promise<HmoTariff[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("hmo_tariffs")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("service_category")
    .order("service_name");

  if (schemeId) query = query.eq("scheme_id", schemeId);

  const { data, error } = await query;
  if (error) {
    console.error("[listHmoTariffs]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapHmoTariff(row as Record<string, unknown>));
}

export async function upsertHmoTariff(input: {
  id?: string;
  schemeId: string;
  serviceCategory: HmoTariff["serviceCategory"];
  serviceName: string;
  hmoPrice: number;
  copayType: HmoTariff["copayType"];
  copayValue: number;
  isActive?: boolean;
  notes?: string;
}): Promise<HmoTariff | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const payload = {
    hospital_id: scoped.hospitalId,
    scheme_id: input.schemeId,
    service_category: input.serviceCategory,
    service_name: input.serviceName.trim(),
    hmo_price: input.hmoPrice,
    copay_type: input.copayType,
    copay_value: input.copayValue,
    is_active: input.isActive ?? true,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await scoped.admin
      .from("hmo_tariffs")
      .update(payload)
      .eq("id", input.id)
      .eq("hospital_id", scoped.hospitalId)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return mapHmoTariff(data as Record<string, unknown>);
  }

  const { data, error } = await scoped.admin
    .from("hmo_tariffs")
    .insert(payload)
    .select("*")
    .single();
  if (error) return { error: error.message };
  return mapHmoTariff(data as Record<string, unknown>);
}

export async function deleteHmoTariff(id: string): Promise<{ ok: true } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { error } = await scoped.admin
    .from("hmo_tariffs")
    .delete()
    .eq("id", id)
    .eq("hospital_id", scoped.hospitalId);

  if (error) return { error: error.message };
  return { ok: true };
}
