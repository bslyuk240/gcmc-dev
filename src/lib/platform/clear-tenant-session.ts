import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Clears platform operator acting context (RLS) when returning to the platform console. */
export async function clearPlatformTenantSession(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("platform_tenant_sessions").delete().eq("user_id", userId);
}
