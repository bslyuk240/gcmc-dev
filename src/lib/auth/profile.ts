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

function isMissingColumnError(error: { code?: string; message?: string }) {
  const message = (error.message ?? "").toLowerCase();
  return error.code === "42703" || message.includes("column") && message.includes("does not exist");
}

export async function resolveStaffProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  selects: string | string[] = [
    "id, full_name, email, department, role, avatar_url, is_active, must_change_password",
    "id, full_name, email, department, role, is_active",
  ],
): Promise<StaffProfileRecord | null> {
  const selectList = Array.isArray(selects) ? selects : [selects];

  for (const select of selectList) {
    const byId = await supabase
      .from("staff_profiles")
      .select(select)
      .eq("id", userId)
      .maybeSingle<StaffProfileRecord>();

    if (byId.data) {
      return byId.data;
    }

    if (byId.error && !isMissingColumnError(byId.error)) {
      console.error(
        "[resolveStaffProfile] id lookup failed:",
        byId.error.message,
        byId.error.details,
      );
      return null;
    }

    if (!email) {
      continue;
    }

    const byEmail = await supabase
      .from("staff_profiles")
      .select(select)
      .eq("email", email)
      .maybeSingle<StaffProfileRecord>();

    if (byEmail.data) {
      return byEmail.data;
    }

    if (byEmail.error && !isMissingColumnError(byEmail.error)) {
      console.error(
        "[resolveStaffProfile] email lookup failed:",
        byEmail.error.message,
        byEmail.error.details,
      );
      return null;
    }

    if (!byId.error && !byEmail.error) {
      return null;
    }
  }

  return null;
}
