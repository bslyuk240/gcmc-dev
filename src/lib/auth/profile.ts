import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffProfileRecord = {
  id: string;
  full_name: string;
  email: string;
  department: string;
  role: string;
  avatar_url?: string | null;
  is_active?: boolean;
  must_change_password?: boolean;
};

export async function resolveStaffProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  select = "id, full_name, email, department, role, avatar_url, is_active, must_change_password",
): Promise<StaffProfileRecord | null> {
  const byId = await supabase
    .from("staff_profiles")
    .select(select)
    .eq("id", userId)
    .maybeSingle<StaffProfileRecord>();

  if (byId.data) {
    return byId.data;
  }

  if (!email) {
    return null;
  }

  const byEmail = await supabase
    .from("staff_profiles")
    .select(select)
    .eq("email", email)
    .maybeSingle<StaffProfileRecord>();

  return byEmail.data ?? null;
}
