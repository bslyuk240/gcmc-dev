import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";

import type { StaffProfileDetails } from "@/modules/staff-portal/types";

export type { StaffProfileDetails };

export async function getStaffProfileDetails(staffId: string): Promise<StaffProfileDetails | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { data, error } = await scoped.admin
    .from("staff_profiles")
    .select(
      "phone, home_address, unit_name, bank_name, bank_account, tax_id, pension_number, nhf_number, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address",
    )
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", staffId)
    .maybeSingle();

  if (error || !data) {
    console.error("[getStaffProfileDetails]", error?.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    phone: row.phone != null ? String(row.phone) : "",
    homeAddress: row.home_address != null ? String(row.home_address) : "",
    unit: row.unit_name != null ? String(row.unit_name) : undefined,
    bankName: row.bank_name != null ? String(row.bank_name) : undefined,
    bankAccount: row.bank_account != null ? String(row.bank_account) : undefined,
    taxId: row.tax_id != null ? String(row.tax_id) : undefined,
    pensionNumber: row.pension_number != null ? String(row.pension_number) : undefined,
    nhfNumber: row.nhf_number != null ? String(row.nhf_number) : undefined,
    emergencyContactName: row.emergency_contact_name != null ? String(row.emergency_contact_name) : undefined,
    emergencyContactRelationship: row.emergency_contact_relationship != null ? String(row.emergency_contact_relationship) : undefined,
    emergencyContactPhone: row.emergency_contact_phone != null ? String(row.emergency_contact_phone) : undefined,
    emergencyContactAddress: row.emergency_contact_address != null ? String(row.emergency_contact_address) : undefined,
  };
}
