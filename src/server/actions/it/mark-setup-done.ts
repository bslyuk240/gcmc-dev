"use server";

import { requireSession } from "@/lib/auth/session";
import { canManageItHelpdesk } from "@/lib/it/access";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";

export async function markSetupDoneAction(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: "User ID is required." };

  const session = await requireSession();
  if (!canManageItHelpdesk(session)) {
    return { success: false, error: "You do not have permission to update onboarding status." };
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) return { success: false, error: "Admin service not configured." };

  const { admin, hospitalId } = scoped;
  const { error } = await admin
    .from("staff_profiles")
    .update({ system_setup_done: true })
    .eq("hospital_id", hospitalId)
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
