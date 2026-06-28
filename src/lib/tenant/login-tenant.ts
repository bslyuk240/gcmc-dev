import "server-only";

import { cookies, headers } from "next/headers";
import { hmsTenantSlugCookieName } from "@/lib/auth/constants";
import { getDefaultHospitalSlug } from "@/lib/tenant/constants";
import { getHospitalBySlug } from "@/lib/tenant/hospitals";
import type { Hospital } from "@/lib/tenant/types";

/** Read tenant slug set by middleware on each request. */
export async function getRequestTenantSlug(): Promise<string> {
  const store = await cookies();
  const fromCookie = store.get(hmsTenantSlugCookieName)?.value?.trim().toLowerCase();
  if (fromCookie) return fromCookie;

  const headerStore = await headers();
  const fromHeader = headerStore.get("x-hms-hospital-slug")?.trim().toLowerCase();
  if (fromHeader) return fromHeader;

  return getDefaultHospitalSlug();
}

/** Resolve active hospital for login — rejects suspended / missing tenants. */
export async function resolveLoginHospital(): Promise<Hospital | null> {
  const slug = await getRequestTenantSlug();
  const hospital = await getHospitalBySlug(slug);
  if (!hospital || hospital.status !== "active") return null;
  return hospital;
}
