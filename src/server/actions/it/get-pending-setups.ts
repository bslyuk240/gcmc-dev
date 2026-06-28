"use server";

import { requireSession } from "@/lib/auth/session";
import { canViewItHelpdesk } from "@/lib/it/access";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";

export type PendingSetupRecord = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  created_at: string;
};

export async function getPendingSetupsAction(): Promise<
  { success: true; data: PendingSetupRecord[] } | { success: false; error: string }
> {
  const session = await requireSession();
  if (!canViewItHelpdesk(session)) {
    return { success: false, error: "You do not have permission to view the onboarding queue." };
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) return { success: false, error: "Admin service not configured." };

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("staff_profiles")
    .select("id, full_name, email, department, role, created_at")
    .eq("hospital_id", hospitalId)
    .eq("system_setup_done", false)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };

  return { success: true, data: data ?? [] };
}
