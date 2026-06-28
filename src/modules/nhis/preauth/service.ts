import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoPreAuth } from "@/modules/nhis/mappers";
import { getVerifiedEnrollmentForPatient } from "@/modules/nhis/enrollments/service";
import type { HmoPreAuthorization, HmoServiceCategory } from "@/modules/nhis/types";

const PREAUTH_SELECT = "*";

function mapPreAuthRow(row: Record<string, unknown>, schemeName?: string): HmoPreAuthorization {
  return mapHmoPreAuth({ ...row, scheme_name: schemeName });
}

async function schemeNameMap(scoped: NonNullable<Awaited<ReturnType<typeof createTenantAdminClient>>>) {
  const { data } = await scoped.admin
    .from("hmo_schemes")
    .select("id, name")
    .eq("hospital_id", scoped.hospitalId);
  return new Map((data ?? []).map((r) => [String(r.id), String(r.name)]));
}

export async function listPreauthorizations(filter?: {
  status?: string;
  schemeId?: string;
}): Promise<HmoPreAuthorization[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("hmo_pre_authorizations")
    .select(PREAUTH_SELECT)
    .eq("hospital_id", scoped.hospitalId)
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.schemeId) query = query.eq("scheme_id", filter.schemeId);

  const { data, error } = await query;
  if (error) {
    console.error("[listPreauthorizations]", error.message);
    return [];
  }
  const schemes = await schemeNameMap(scoped);
  return (data ?? []).map((row) =>
    mapPreAuthRow(row as Record<string, unknown>, schemes.get(String(row.scheme_id))),
  );
}

export async function createPreauthorization(input: {
  patientRef: string;
  patientName: string;
  serviceCategory: HmoServiceCategory;
  serviceName: string;
  amountCap?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  requestedBy?: string;
  requestedByName: string;
}): Promise<HmoPreAuthorization | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const enrollment = await getVerifiedEnrollmentForPatient(input.patientRef);
  if (!enrollment) {
    return { error: "Patient has no verified HMO enrollment." };
  }

  const { data: reg } = await scoped.admin
    .from("patient_registrations")
    .select("id")
    .eq("hospital_id", scoped.hospitalId)
    .or(`id.eq.${input.patientRef},patient_id.eq.${input.patientRef}`)
    .maybeSingle();

  if (!reg) return { error: "Patient registration not found." };

  const { data, error } = await scoped.admin
    .from("hmo_pre_authorizations")
    .insert({
      hospital_id: scoped.hospitalId,
      patient_id: reg.id,
      patient_ref: input.patientRef,
      patient_name: input.patientName,
      enrollment_id: enrollment.id,
      scheme_id: enrollment.schemeId,
      service_category: input.serviceCategory,
      service_name: input.serviceName.trim(),
      amount_cap: input.amountCap ?? null,
      notes: input.notes ?? null,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      requested_by: input.requestedBy ?? null,
      requested_by_name: input.requestedByName,
      status: "pending",
    })
    .select(PREAUTH_SELECT)
    .single();

  if (error) return { error: error.message };
  const schemes = await schemeNameMap(scoped);
  return mapPreAuthRow(data as Record<string, unknown>, schemes.get(String(data.scheme_id)));
}

export async function reviewPreauthorization(input: {
  id: string;
  action: "approve" | "deny";
  reviewerId?: string;
  reviewerName: string;
  authCode?: string;
  validUntil?: string;
  notes?: string;
}): Promise<{ preauthId: string; status: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("nhis_review_preauth", {
    p_hospital_id: scoped.hospitalId,
    p_preauth_id: input.id,
    p_action: input.action,
    p_reviewer_id: input.reviewerId ?? null,
    p_reviewer_name: input.reviewerName,
    p_auth_code: input.authCode ?? "",
    p_valid_until: input.validUntil ?? null,
    p_notes: input.notes ?? "",
  });

  if (error) return { error: error.message };
  const payload = data as { preauthId?: string; status?: string };
  return { preauthId: String(payload.preauthId ?? input.id), status: String(payload.status ?? "") };
}

export async function checkPreauthStatus(input: {
  patientRef: string;
  serviceCategory: HmoServiceCategory;
}): Promise<{
  required: boolean;
  hasEnrollment: boolean;
  approved: boolean;
  pending: boolean;
}> {
  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return { required: false, hasEnrollment: false, approved: false, pending: false };
  }

  const requiresPreauth = ["admission", "procedure"].includes(input.serviceCategory);
  const enrollment = await getVerifiedEnrollmentForPatient(input.patientRef);

  if (!enrollment) {
    return { required: requiresPreauth, hasEnrollment: false, approved: !requiresPreauth, pending: false };
  }

  if (!requiresPreauth) {
    return { required: false, hasEnrollment: true, approved: true, pending: false };
  }

  const { data: approvedRows } = await scoped.admin
    .from("hmo_pre_authorizations")
    .select("id, valid_until")
    .eq("hospital_id", scoped.hospitalId)
    .eq("status", "approved")
    .eq("service_category", input.serviceCategory)
    .or(`patient_ref.eq.${input.patientRef},patient_id.eq.${enrollment.patientId}`);

  const approved = (approvedRows ?? []).some((row) => {
    if (!row.valid_until) return true;
    return String(row.valid_until) >= new Date().toISOString().slice(0, 10);
  });

  const { data: pendingRows } = await scoped.admin
    .from("hmo_pre_authorizations")
    .select("id")
    .eq("hospital_id", scoped.hospitalId)
    .eq("status", "pending")
    .eq("service_category", input.serviceCategory)
    .or(`patient_ref.eq.${input.patientRef},patient_id.eq.${enrollment.patientId}`)
    .limit(1);

  return {
    required: true,
    hasEnrollment: true,
    approved,
    pending: (pendingRows?.length ?? 0) > 0,
  };
}
