export {
  GCMC_HOSPITAL_ID,
  GCMC_HOSPITAL_SLUG,
  getDefaultHospitalId,
  getDefaultHospitalSlug,
} from "@/lib/tenant/constants";
export {
  getCurrentHospital,
  getHospitalById,
  getHospitalBySlug,
  listActiveHospitals,
} from "@/lib/tenant/hospitals";
export {
  getResolvedHospitalId,
  requireTenantContext,
} from "@/lib/tenant/context";
export { getRequestTenantSlug, resolveLoginHospital } from "@/lib/tenant/login-tenant";
export { resolveTenantSlug, sessionMatchesTenant } from "@/lib/tenant/resolve";
export type {
  Hospital,
  HospitalPlan,
  HospitalSettings,
  HospitalStatus,
  PlatformAdmin,
} from "@/lib/tenant/types";
export type { TenantContext } from "@/lib/tenant/context";
export {
  DEFAULT_BRANDING,
  escapeHtml,
  hospitalToBranding,
  sanitizeSettingsInput,
  toReceiptBranding,
} from "@/lib/tenant/branding";
export type {
  HospitalSettingsInput,
  ReceiptBranding,
  TenantBranding,
} from "@/lib/tenant/branding";
export { getTenantBranding } from "@/lib/tenant/get-branding";
