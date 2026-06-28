import "server-only";

import { defaultPresetAmount } from "@/lib/billing/preset-catalog";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";

export async function getBillingPresetAmount(
  category: string,
  name: string,
  fallback: number,
): Promise<number> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return fallback;

  const { data, error } = await scoped.admin
    .from("billing_presets")
    .select("amount")
    .eq("hospital_id", scoped.hospitalId)
    .eq("category", category)
    .eq("name", name)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[getBillingPresetAmount]", error.message);
    return fallback;
  }

  if (data?.amount != null) return Number(data.amount);
  return fallback;
}

export async function getBedDayRate(unit: string): Promise<number> {
  const fallback = defaultPresetAmount("inpatient", unit) ?? defaultPresetAmount("inpatient", "Ward") ?? 25000;
  return getBillingPresetAmount("inpatient", unit, fallback);
}
