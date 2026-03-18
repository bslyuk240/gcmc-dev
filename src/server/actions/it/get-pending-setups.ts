"use server";

import { createAdminClient } from "@/lib/supabase/admin";

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
  const admin = createAdminClient();
  if (!admin) return { success: false, error: "Admin service not configured." };

  const { data, error } = await admin
    .from("staff_profiles")
    .select("id, full_name, email, department, role, created_at")
    .eq("system_setup_done", false)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };

  return { success: true, data: data ?? [] };
}
