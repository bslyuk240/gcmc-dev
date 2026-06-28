import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoClaim, mapHmoClaimLine } from "@/modules/nhis/mappers";
import type { HmoClaim, UnclaimedHmoCharge } from "@/modules/nhis/types";

const CLAIM_SELECT = `
  *,
  hmo_schemes!hmo_claims_scheme_id_fkey(name),
  patient_registrations!hmo_claims_patient_id_fkey(patient_name)
`;

async function attachClaimLines(
  scoped: NonNullable<Awaited<ReturnType<typeof createTenantAdminClient>>>,
  claims: HmoClaim[],
): Promise<HmoClaim[]> {
  if (!claims.length) return claims;

  const claimIds = claims.map((c) => c.id);
  const { data: lines } = await scoped.admin
    .from("hmo_claim_lines")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .in("claim_id", claimIds);

  const byClaim = new Map<string, ReturnType<typeof mapHmoClaimLine>[]>();
  for (const row of lines ?? []) {
    const claimId = String(row.claim_id);
    const mapped = mapHmoClaimLine(row as Record<string, unknown>);
    byClaim.set(claimId, [...(byClaim.get(claimId) ?? []), mapped]);
  }

  return claims.map((c) => ({ ...c, lines: byClaim.get(c.id) ?? c.lines ?? [] }));
}

function mapClaimRow(row: Record<string, unknown>): HmoClaim {
  const schemeName = (row.hmo_schemes as { name?: string } | null)?.name ?? "";
  const patientName =
    (row.patient_registrations as { patient_name?: string } | null)?.patient_name ?? "";
  return mapHmoClaim(row, { schemeName, patientName });
}

export async function listHmoClaims(filter?: {
  status?: string;
  schemeId?: string;
}): Promise<HmoClaim[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("hmo_claims")
    .select(CLAIM_SELECT)
    .eq("hospital_id", scoped.hospitalId)
    .order("created_at", { ascending: false });

  if (filter?.status) query = query.eq("status", filter.status);
  if (filter?.schemeId) query = query.eq("scheme_id", filter.schemeId);

  const { data, error } = await query;
  if (error) {
    console.error("[listHmoClaims]", error.message);
    return [];
  }

  const claims = (data ?? []).map((row) => mapClaimRow(row as Record<string, unknown>));
  return attachClaimLines(scoped, claims);
}

export async function listUnclaimedHmoCharges(patientRef?: string): Promise<UnclaimedHmoCharge[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  let query = scoped.admin
    .from("billing_charge_lines")
    .select("*")
    .eq("hospital_id", scoped.hospitalId)
    .eq("is_hmo", true)
    .is("hmo_claim_id", null)
    .gt("hmo_amount", 0)
    .order("billable_at", { ascending: false });

  if (patientRef) {
    query = query.or(`patient_id.eq.${patientRef},patient_id.eq.${patientRef}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[listUnclaimedHmoCharges]", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const copay = row.copay_amount != null ? Number(row.copay_amount) : undefined;
    const amountPaid = Number(row.amount_paid ?? 0);
    const copayDue = copay ?? Number(row.total_amount ?? 0);
    return {
      id: String(row.id),
      patientId: String(row.patient_id ?? ""),
      patientName: String(row.patient_name ?? ""),
      department: String(row.department ?? ""),
      description: String(row.description ?? ""),
      totalAmount: Number(row.total_amount ?? 0),
      copayAmount: copay,
      hmoAmount: row.hmo_amount != null ? Number(row.hmo_amount) : undefined,
      amountPaid,
      copayCollected: amountPaid >= copayDue,
      billableAt: String(row.billable_at ?? ""),
    };
  });
}

export async function applyHmoTariffToCharge(chargeLineId: string): Promise<
  | { chargeLineId: string; schemeId: string; totalAmount: number; copayAmount: number; hmoAmount: number }
  | { error: string }
> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("nhis_apply_hmo_tariff", {
    p_hospital_id: scoped.hospitalId,
    p_charge_line_id: chargeLineId,
  });

  if (error) {
    console.error("[applyHmoTariffToCharge]", error.message);
    return { error: error.message };
  }

  const payload = data as Record<string, unknown>;
  return {
    chargeLineId: String(payload.chargeLineId ?? chargeLineId),
    schemeId: String(payload.schemeId ?? ""),
    totalAmount: Number(payload.totalAmount ?? 0),
    copayAmount: Number(payload.copayAmount ?? 0),
    hmoAmount: Number(payload.hmoAmount ?? 0),
  };
}

export async function buildHmoClaim(input: {
  patientRef: string;
  enrollmentId: string;
  chargeLineIds: string[];
  notes?: string;
  createdBy?: string;
  createdByName?: string;
}): Promise<{ claimId: string; claimNumber: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("nhis_build_claim", {
    p_hospital_id: scoped.hospitalId,
    p_patient_ref: input.patientRef,
    p_charge_line_ids: input.chargeLineIds,
    p_enrollment_id: input.enrollmentId,
    p_created_by: input.createdBy ?? null,
    p_created_by_name: input.createdByName ?? "",
    p_notes: input.notes ?? "",
  });

  if (error) {
    console.error("[buildHmoClaim]", error.message);
    return { error: error.message };
  }

  const payload = data as Record<string, unknown>;
  return {
    claimId: String(payload.claimId ?? ""),
    claimNumber: String(payload.claimNumber ?? ""),
  };
}

export async function transitionHmoClaim(input: {
  claimId: string;
  action: "submit" | "approve" | "reject" | "mark_paid" | "mark_partial";
  actorId?: string;
  actorName: string;
  rejectionReason?: string;
  amountPaid?: number;
}): Promise<{ claimId: string; status: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("nhis_transition_claim", {
    p_hospital_id: scoped.hospitalId,
    p_claim_id: input.claimId,
    p_action: input.action,
    p_actor_id: input.actorId ?? null,
    p_actor_name: input.actorName,
    p_rejection_reason: input.rejectionReason ?? "",
    p_amount_paid: input.amountPaid ?? null,
  });

  if (error) {
    console.error("[transitionHmoClaim]", error.message);
    return { error: error.message };
  }

  const payload = data as Record<string, unknown>;
  return {
    claimId: String(payload.claimId ?? input.claimId),
    status: String(payload.status ?? ""),
  };
}

export async function applyHmoToPatientCharges(patientRef: string): Promise<{ applied: number; errors: string[] }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { applied: 0, errors: ["Service not configured."] };

  const { data: lines } = await scoped.admin
    .from("billing_charge_lines")
    .select("id")
    .eq("hospital_id", scoped.hospitalId)
    .or(`patient_id.eq.${patientRef}`)
    .eq("is_hmo", false)
    .in("status", ["open", "partial"]);

  let applied = 0;
  const errors: string[] = [];

  for (const line of lines ?? []) {
    const result = await applyHmoTariffToCharge(String(line.id));
    if ("error" in result) errors.push(result.error);
    else applied++;
  }

  return { applied, errors };
}
