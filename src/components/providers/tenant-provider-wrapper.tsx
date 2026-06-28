import "server-only";

import { getTenantBranding } from "@/lib/tenant/get-branding";
import { TenantProviderClient } from "@/components/providers/tenant-provider-client";

export async function TenantProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getTenantBranding();
  return <TenantProviderClient branding={branding}>{children}</TenantProviderClient>;
}
