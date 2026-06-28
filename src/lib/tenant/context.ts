import "server-only";

import { getRequestTenantSlug } from "@/lib/tenant/login-tenant";
import { getHospitalBySlug, getHospitalById } from "@/lib/tenant/hospitals";
import { getDefaultHospitalId } from "@/lib/tenant/constants";
import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import type { Hospital } from "@/lib/tenant/types";

export type TenantContext = {
  hospitalId: string;
  hospital: Hospital;
};

export async function getCurrentHospital(): Promise<Hospital | null> {
  const slug = await getRequestTenantSlug();
  const bySlug = await getHospitalBySlug(slug);
  if (bySlug) return bySlug;
  return getHospitalById(getDefaultHospitalId());
}

/**
 * Resolve the active tenant for the current request.
 * Validates hospital is active — use on server actions before writes.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const hospital = await getCurrentHospital();
  if (!hospital) {
    throw new Error("Tenant not found");
  }

  const session = (await getServerSession()) ?? (await getStaffPortalSession());
  if (session?.platform_entry) {
    if (session.hospital_id !== hospital.id) {
      throw new Error("Tenant mismatch");
    }
    return { hospitalId: hospital.id, hospital };
  }

  if (hospital.status === "suspended") {
    throw new Error("Hospital account suspended");
  }
  if (hospital.status !== "active") {
    throw new Error("Hospital not active");
  }
  return { hospitalId: hospital.id, hospital };
}

/** Server-side hospital id for inserts — prefer requireTenantContext when possible. */
export async function getResolvedHospitalId(): Promise<string> {
  const ctx = await requireTenantContext();
  return ctx.hospitalId;
}

export { getDefaultHospitalId };
