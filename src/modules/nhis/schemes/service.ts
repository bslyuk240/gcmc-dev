import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoScheme } from "@/modules/nhis/mappers";
import type { HmoScheme } from "@/modules/nhis/types";

export async function listHmoSchemes(): Promise<HmoScheme[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("hmo_schemes")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("name");

  if (error) {
    console.error("[listHmoSchemes]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapHmoScheme(row as Record<string, unknown>));
}

export async function upsertHmoScheme(input: {
  id?: string;
  name: string;
  code: string;
  type: HmoScheme["type"];
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}): Promise<HmoScheme | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const payload = {
    hospital_id: scoped.hospitalId,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    type: input.type,
    contact_person: input.contactPerson ?? null,
    contact_phone: input.contactPhone ?? null,
    contact_email: input.contactEmail ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await scoped.admin
      .from("hmo_schemes")
      .update(payload)
      .eq("id", input.id)
      .eq("hospital_id", scoped.hospitalId)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return mapHmoScheme(data as Record<string, unknown>);
  }

  const { data, error } = await scoped.admin
    .from("hmo_schemes")
    .insert(payload)
    .select("*")
    .single();
  if (error) return { error: error.message };
  return mapHmoScheme(data as Record<string, unknown>);
}
