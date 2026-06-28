import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import { requireTenantContext } from "@/lib/tenant/context";

/**
 * Resolve hospital_id for service-role queries.
 * Service role bypasses RLS — always filter manually by this id.
 */
export async function resolveAdminHospitalId(): Promise<string | null> {
  const session = (await getServerSession()) ?? (await getStaffPortalSession());
  if (session?.hospital_id) return session.hospital_id;

  try {
    const ctx = await requireTenantContext();
    return ctx.hospitalId;
  } catch {
    return null;
  }
}

export type TenantAdminClient = {
  admin: SupabaseClient;
  hospitalId: string;
};

/** Admin client scoped to the current tenant. Returns null if unconfigured or tenant unknown. */
export async function createTenantAdminClient(): Promise<TenantAdminClient | null> {
  const admin = createAdminClient();
  const hospitalId = await resolveAdminHospitalId();
  if (!admin || !hospitalId) return null;
  return { admin, hospitalId };
}
