"use client";

import { TenantProvider } from "@/modules/tenant/tenant-context";
import type { TenantBranding } from "@/lib/tenant/branding";

export function TenantProviderClient({
  branding,
  children,
}: {
  branding: TenantBranding;
  children: React.ReactNode;
}) {
  return <TenantProvider branding={branding}>{children}</TenantProvider>;
}
