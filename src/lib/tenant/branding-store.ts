import type { ReceiptBranding, TenantBranding } from "@/lib/tenant/branding";
import { DEFAULT_BRANDING, toReceiptBranding } from "@/lib/tenant/branding";

let clientBranding: TenantBranding | null = null;

export function setClientTenantBranding(branding: TenantBranding): void {
  clientBranding = branding;
}

export function getClientTenantBranding(): TenantBranding {
  return clientBranding ?? DEFAULT_BRANDING;
}

export function getClientReceiptBranding(): ReceiptBranding {
  return toReceiptBranding(getClientTenantBranding());
}

export { DEFAULT_BRANDING };
