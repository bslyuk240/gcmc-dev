"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function markSetupDoneAction(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: "User ID is required." };

  const admin = createAdminClient();
  if (!admin) return { success: false, error: "Admin service not configured." };

  const { error } = await admin
    .from("staff_profiles")
    .update({ system_setup_done: true })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  return { success: true };
}
