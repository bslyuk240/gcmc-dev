import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";

const BUCKET = "staff-documents";

export async function getStaffDocumentById(documentId: string, hospitalId?: string) {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const scopedHospitalId = hospitalId ?? scoped.hospitalId;
  if (hospitalId && scoped.hospitalId !== hospitalId) return null;

  const { data, error } = await scoped.admin
    .from("staff_documents")
    .select("*")
    .eq("hospital_id", scopedHospitalId)
    .eq("id", documentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

export async function createDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { data, error } = await scoped.admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 15);

  if (error || !data?.signedUrl) {
    console.error("[createDocumentSignedUrl]", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function uploadStaffDocumentFile(input: {
  staffId: string;
  fileName: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<{ storagePath: string; fileName: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const safeName = input.fileName.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  const storagePath = `${scoped.hospitalId}/${input.staffId}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await scoped.admin.storage
    .from(BUCKET)
    .upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) return { error: error.message };
  return { storagePath, fileName: safeName };
}
