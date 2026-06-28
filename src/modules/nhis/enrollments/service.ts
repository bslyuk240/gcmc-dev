import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoEnrollment } from "@/modules/nhis/mappers";
import type { HmoEnrollment, HmoRegistration } from "@/modules/nhis/types";

const ENROLLMENT_SELECT = `
  *,
  patient_registrations!patient_hmo_enrollments_patient_id_fkey(patient_name, patient_id),
  hmo_schemes!patient_hmo_enrollments_scheme_id_fkey(name)
`;

function mapEnrollmentRow(row: Record<string, unknown>): HmoEnrollment {
  const patReg = row.patient_registrations as { patient_name?: string; patient_id?: string } | null;
  const scheme = row.hmo_schemes as { name?: string } | null;
  return mapHmoEnrollment(row, {
    patientName: patReg?.patient_name ?? "",
    patientDisplayId: patReg?.patient_id ?? "",
    schemeName: scheme?.name ?? "",
  });
}

export async function listHmoEnrollments(filter?: {
  verificationStatus?: string;
  schemeId?: string;
}): Promise<HmoEnrollment[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("patient_hmo_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("hospital_id", scoped.hospitalId)
    .order("created_at", { ascending: false });

  if (filter?.verificationStatus) query = query.eq("verification_status", filter.verificationStatus);
  if (filter?.schemeId) query = query.eq("scheme_id", filter.schemeId);

  const { data, error } = await query;
  if (error) {
    console.error("[listHmoEnrollments]", error.message);
    return [];
  }
  return (data ?? []).map((row) => mapEnrollmentRow(row as Record<string, unknown>));
}

export async function listPendingHmoRegistrations(): Promise<HmoRegistration[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data: registrations, error: regError } = await scoped.admin
    .from("patient_registrations")
    .select("id, patient_id, patient_name, has_hmo, primary_hmo_scheme_id, registered_at, registered_by")
    .eq("hospital_id", scoped.hospitalId)
    .eq("has_hmo", true)
    .order("registered_at", { ascending: false });

  if (regError) {
    console.error("[listPendingHmoRegistrations]", regError.message);
    return [];
  }

  const { data: enrollments } = await scoped.admin
    .from("patient_hmo_enrollments")
    .select("patient_id")
    .eq("hospital_id", scoped.hospitalId);

  const enrolledPatientIds = new Set((enrollments ?? []).map((e) => String(e.patient_id)));

  return (registrations ?? [])
    .filter((r) => !enrolledPatientIds.has(String(r.id)))
    .map((r) => ({
      id: String(r.id),
      patientId: String(r.id),
      patientDisplayId: String(r.patient_id ?? ""),
      patientName: String(r.patient_name ?? ""),
      primaryHmoSchemeId: r.primary_hmo_scheme_id ? String(r.primary_hmo_scheme_id) : undefined,
      registeredAt: String(r.registered_at ?? ""),
      registeredBy: String(r.registered_by ?? ""),
      hasHmo: Boolean(r.has_hmo),
    }));
}

export async function createHmoEnrollment(input: {
  patientId: string;
  schemeId: string;
  memberId: string;
  planName?: string;
  copayPercentage?: number;
  validFrom?: string;
  validUntil?: string;
  authorizedBy?: string;
  notes?: string;
  verifyImmediately?: boolean;
  createdBy?: string;
  createdByName?: string;
}): Promise<HmoEnrollment | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const verificationStatus = input.verifyImmediately ? "verified" : "pending";

  const { data, error } = await scoped.admin
    .from("patient_hmo_enrollments")
    .insert({
      hospital_id: scoped.hospitalId,
      patient_id: input.patientId,
      scheme_id: input.schemeId,
      member_id: input.memberId.trim(),
      plan_name: input.planName ?? null,
      copay_percentage: input.copayPercentage ?? 10,
      is_active: true,
      verification_status: verificationStatus,
      verified_at: verificationStatus === "verified" ? new Date().toISOString() : null,
      verified_by: verificationStatus === "verified" ? input.createdBy ?? null : null,
      verified_by_name: verificationStatus === "verified" ? input.createdByName ?? null : null,
      valid_from: input.validFrom ?? null,
      valid_until: input.validUntil ?? null,
      authorized_by: input.authorizedBy ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select(ENROLLMENT_SELECT)
    .single();

  if (error) return { error: error.message };

  await scoped.admin
    .from("patient_registrations")
    .update({ has_hmo: true, primary_hmo_scheme_id: input.schemeId })
    .eq("id", input.patientId)
    .eq("hospital_id", scoped.hospitalId);

  return mapEnrollmentRow(data as Record<string, unknown>);
}

export async function updateHmoEnrollment(
  id: string,
  patch: Partial<{
    memberId: string;
    planName: string;
    copayPercentage: number;
    isActive: boolean;
    validFrom: string;
    validUntil: string;
    authorizedBy: string;
    notes: string;
  }>,
): Promise<HmoEnrollment | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.memberId !== undefined) update.member_id = patch.memberId;
  if (patch.planName !== undefined) update.plan_name = patch.planName;
  if (patch.copayPercentage !== undefined) update.copay_percentage = patch.copayPercentage;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;
  if (patch.validFrom !== undefined) update.valid_from = patch.validFrom;
  if (patch.validUntil !== undefined) update.valid_until = patch.validUntil;
  if (patch.authorizedBy !== undefined) update.authorized_by = patch.authorizedBy;
  if (patch.notes !== undefined) update.notes = patch.notes;

  const { data, error } = await scoped.admin
    .from("patient_hmo_enrollments")
    .update(update)
    .eq("id", id)
    .eq("hospital_id", scoped.hospitalId)
    .select(ENROLLMENT_SELECT)
    .single();

  if (error) return { error: error.message };
  return mapEnrollmentRow(data as Record<string, unknown>);
}

export async function verifyHmoEnrollment(input: {
  id: string;
  action: "verify" | "reject" | "suspend";
  actorId?: string;
  actorName: string;
  rejectionReason?: string;
}): Promise<HmoEnrollment | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const status =
    input.action === "verify" ? "verified"
    : input.action === "reject" ? "rejected"
    : "suspended";

  if (input.action === "reject" && !input.rejectionReason?.trim()) {
    return { error: "Rejection reason is required." };
  }

  const { data, error } = await scoped.admin
    .from("patient_hmo_enrollments")
    .update({
      verification_status: status,
      is_active: input.action === "verify",
      verified_at: input.action === "verify" ? new Date().toISOString() : null,
      verified_by: input.action === "verify" ? input.actorId ?? null : null,
      verified_by_name: input.action === "verify" ? input.actorName : null,
      rejection_reason: input.action === "reject" ? input.rejectionReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("hospital_id", scoped.hospitalId)
    .select(ENROLLMENT_SELECT)
    .single();

  if (error) return { error: error.message };
  return mapEnrollmentRow(data as Record<string, unknown>);
}

export async function getVerifiedEnrollmentForPatient(patientRef: string): Promise<HmoEnrollment | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { data: reg } = await scoped.admin
    .from("patient_registrations")
    .select("id")
    .eq("hospital_id", scoped.hospitalId)
    .or(`id.eq.${patientRef},patient_id.eq.${patientRef}`)
    .maybeSingle();

  if (!reg) return null;

  const { data, error } = await scoped.admin
    .from("patient_hmo_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("hospital_id", scoped.hospitalId)
    .eq("patient_id", reg.id)
    .eq("verification_status", "verified")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapEnrollmentRow(data as Record<string, unknown>);
}
