"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type { RoleKey } from "@/lib/auth/session";

export type CreateStaffAccountInput = {
  full_name: string;
  email: string;
  department: DBDepartmentKey;
  role: RoleKey;
  unit_name?: string; // non-clinical staff only
  specialty?: string; // doctor clinical specialty
};

export type CreateStaffAccountResult =
  | { success: true; tempPassword: string }
  | { success: false; error: string };

/** Generates a secure temporary password: e.g. GCMC@Xk9Lm2Np */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "GCMC@";
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

export async function createStaffAccountAction(
  input: CreateStaffAccountInput,
): Promise<CreateStaffAccountResult> {
  const { full_name, email, department, role, unit_name, specialty } = input;

  if (!full_name || !email || !department || !role) {
    return { success: false, error: "All fields are required." };
  }
  if (department === "doctors" && !specialty?.trim()) {
    return { success: false, error: "Doctor specialty is required." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: "Admin service not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local." };
  }

  const tempPassword = generateTempPassword();

  // 1. Create the Supabase Auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // skip email confirmation
    user_metadata: { full_name },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Failed to create auth user." };
  }

  const userId = authData.user.id;

  // 2. Insert into staff_profiles
  const { error: profileError } = await admin
    .from("staff_profiles")
    .insert({
      id: userId,
      full_name,
      email,
      department,
      role,
      is_active: true,
      must_change_password: true,  // force password change on first login
      system_setup_done: false,    // IT must confirm workstation setup
      ...(unit_name ? { unit_name } : {}),
      ...(specialty?.trim() ? { specialty: specialty.trim() } : {}),
    });

  if (profileError) {
    // Roll back the auth user to avoid orphans
    await admin.auth.admin.deleteUser(userId);
    return { success: false, error: profileError.message };
  }

  return { success: true, tempPassword };
}
