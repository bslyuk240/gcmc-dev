import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapStaffDocument } from "@/modules/staff-portal/mappers";
import type { StaffDocument } from "@/modules/staff-portal/types";

export async function listMyDocuments(staffId: string): Promise<StaffDocument[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("staff_documents")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("staff_id", staffId)
    .eq("visible_to_staff", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listMyDocuments]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapStaffDocument(row as Record<string, unknown>));
}

export async function listStaffDocumentsForHr(staffId?: string): Promise<StaffDocument[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("staff_documents")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .order("created_at", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query;
  if (error) {
    console.error("[listStaffDocumentsForHr]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapStaffDocument(row as Record<string, unknown>));
}

export async function createStaffDocument(input: {
  staffId: string;
  title: string;
  category: string;
  issuedOn?: string;
  expiryDate?: string;
  fileName?: string;
  storagePath?: string;
  notes?: string;
  uploadedBy: string;
}): Promise<StaffDocument | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin
    .from("staff_documents")
    .insert({
      hospital_id: scoped.hospitalId,
      staff_id: input.staffId,
      title: input.title.trim(),
      category: input.category,
      issued_on: input.issuedOn ?? null,
      expiry_date: input.expiryDate ?? null,
      file_name: input.fileName ?? null,
      storage_path: input.storagePath ?? null,
      notes: input.notes ?? null,
      uploaded_by: input.uploadedBy,
      visible_to_staff: true,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save document." };
  return mapStaffDocument(data as Record<string, unknown>);
}
