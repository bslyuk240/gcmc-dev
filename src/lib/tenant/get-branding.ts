import "server-only";

import { cache } from "react";
import { getCurrentHospital } from "@/lib/tenant/context";
import {
  DEFAULT_BRANDING,
  hospitalToBranding,
  type TenantBranding,
} from "@/lib/tenant/branding";

/** Per-request cached tenant branding for server components and layouts. */
export const getTenantBranding = cache(async (): Promise<TenantBranding> => {
  const hospital = await getCurrentHospital();
  if (!hospital) return DEFAULT_BRANDING;
  return hospitalToBranding(hospital);
});

/**
 * Returns null when there is no resolved tenant (root/platform domain).
 * Use this in layouts and pages that must distinguish between
 * "a hospital's public portal" and "the platform's own pages".
 */
export const getTenantBrandingOrNull = cache(async (): Promise<TenantBranding | null> => {
  const hospital = await getCurrentHospital();
  if (!hospital) return null;
  return hospitalToBranding(hospital);
});
