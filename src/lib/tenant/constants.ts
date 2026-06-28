/**
 * Stable UUID for GCMC — tenant #1.
 * Must match supabase/migrations/0044_tenant_foundation.sql seed.
 */
export const GCMC_HOSPITAL_ID = "c0ffee00-0001-4000-8000-000000000001";

/** URL/subdomain slug for GCMC. */
export const GCMC_HOSPITAL_SLUG = "gcmc";

/**
 * Fallback hospital when tenant is not yet resolved from subdomain (Phase 1–2 dev).
 * Override with DEFAULT_HOSPITAL_ID env in .env.local.
 */
export function getDefaultHospitalId(): string {
  return process.env.DEFAULT_HOSPITAL_ID ?? GCMC_HOSPITAL_ID;
}

export function getDefaultHospitalSlug(): string {
  return process.env.DEFAULT_HOSPITAL_SLUG ?? GCMC_HOSPITAL_SLUG;
}
