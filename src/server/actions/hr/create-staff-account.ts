"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type { RoleKey } from "@/lib/auth/session";

export type CreateStaffAccountInput = {
  full_name: string;
  email: string;
  department: DBDepartmentKey;
  role: RoleKey;
  phone?: string;
  home_address?: string;
  unit_name?: string; // non-clinical staff only
  specialty?: string; // doctor clinical specialty
  bank_name?: string;
  bank_account?: string;
  tax_id?: string;
  pension_number?: string;
  nhf_number?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  emergency_contact_address?: string;
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

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  return (error?.message ?? "").toLowerCase().includes(`column ${column.toLowerCase()} does not exist`);
}

function withoutOptionalFields<T extends Record<string, unknown>>(payload: T) {
  const fallbackPayload = { ...payload };
  delete fallbackPayload.specialty;
  delete fallbackPayload.phone;
  delete fallbackPayload.home_address;
  delete fallbackPayload.bank_name;
  delete fallbackPayload.bank_account;
  delete fallbackPayload.tax_id;
  delete fallbackPayload.pension_number;
  delete fallbackPayload.nhf_number;
  delete fallbackPayload.emergency_contact_name;
  delete fallbackPayload.emergency_contact_relationship;
  delete fallbackPayload.emergency_contact_phone;
  delete fallbackPayload.emergency_contact_address;
  return fallbackPayload;
}

export async function createStaffAccountAction(
  input: CreateStaffAccountInput,
): Promise<CreateStaffAccountResult> {
  const {
    full_name,
    email,
    department,
    role,
    phone,
    home_address,
    unit_name,
    specialty,
    bank_name,
    bank_account,
    tax_id,
    pension_number,
    nhf_number,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    emergency_contact_address,
  } = input;

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
  const payload = {
    id: userId,
    full_name,
    email,
    department,
    role,
    is_active: true,
    must_change_password: true,
    system_setup_done: false,
    ...(phone ? { phone } : {}),
    ...(home_address ? { home_address } : {}),
    ...(unit_name ? { unit_name } : {}),
    ...(specialty?.trim() ? { specialty: specialty.trim() } : {}),
    ...(bank_name ? { bank_name } : {}),
    ...(bank_account ? { bank_account } : {}),
    ...(tax_id ? { tax_id } : {}),
    ...(pension_number ? { pension_number } : {}),
    ...(nhf_number ? { nhf_number } : {}),
    ...(emergency_contact_name ? { emergency_contact_name } : {}),
    ...(emergency_contact_relationship ? { emergency_contact_relationship } : {}),
    ...(emergency_contact_phone ? { emergency_contact_phone } : {}),
    ...(emergency_contact_address ? { emergency_contact_address } : {}),
  };
  let { error: profileError } = await admin
    .from("staff_profiles")
    .insert(payload);

  if (profileError && (
    isMissingColumnError(profileError, "staff_profiles.specialty")
    || isMissingColumnError(profileError, "staff_profiles.phone")
    || isMissingColumnError(profileError, "staff_profiles.home_address")
    || isMissingColumnError(profileError, "staff_profiles.bank_name")
    || isMissingColumnError(profileError, "staff_profiles.bank_account")
    || isMissingColumnError(profileError, "staff_profiles.tax_id")
    || isMissingColumnError(profileError, "staff_profiles.pension_number")
    || isMissingColumnError(profileError, "staff_profiles.nhf_number")
    || isMissingColumnError(profileError, "staff_profiles.emergency_contact_name")
    || isMissingColumnError(profileError, "staff_profiles.emergency_contact_relationship")
    || isMissingColumnError(profileError, "staff_profiles.emergency_contact_phone")
    || isMissingColumnError(profileError, "staff_profiles.emergency_contact_address")
  )) {
    ({ error: profileError } = await admin.from("staff_profiles").insert(withoutOptionalFields(payload)));
  }

  if (profileError) {
    // Roll back the auth user to avoid orphans
    await admin.auth.admin.deleteUser(userId);
    return { success: false, error: profileError.message };
  }

  return { success: true, tempPassword };
}
