import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { mapHmoRemittance } from "@/modules/nhis/mappers";
import type { HmoRemittance } from "@/modules/nhis/types";

export async function listHmoRemittances(): Promise<HmoRemittance[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data, error } = await scoped.admin
    .from("hmo_remittances")
    .select(`
      *,
      hmo_schemes!hmo_remittances_scheme_id_fkey(name)
    `)
    .eq("hospital_id", scoped.hospitalId)
    .order("received_at", { ascending: false });

  if (error) {
    console.error("[listHmoRemittances]", error.message);
    return [];
  }

  const remittances = (data ?? []).map((row) => {
    const mapped = mapHmoRemittance(row as Record<string, unknown>);
    mapped.schemeName = (row.hmo_schemes as { name?: string } | null)?.name;
    return mapped;
  });

  if (!remittances.length) return remittances;

  const ids = remittances.map((r) => r.id);
  const { data: allocs } = await scoped.admin
    .from("hmo_remittance_allocations")
    .select(`
      remittance_id, claim_id, amount,
      hmo_claims!hmo_remittance_allocations_claim_id_fkey(claim_number)
    `)
    .eq("hospital_id", scoped.hospitalId)
    .in("remittance_id", ids);

  const byRemittance = new Map<string, HmoRemittance["allocations"]>();
  for (const row of allocs ?? []) {
    const remittanceId = String(row.remittance_id);
    const claim = row.hmo_claims as { claim_number?: string } | null;
    byRemittance.set(remittanceId, [
      ...(byRemittance.get(remittanceId) ?? []),
      {
        claimId: String(row.claim_id),
        claimNumber: claim?.claim_number,
        amount: Number(row.amount ?? 0),
      },
    ]);
  }

  return remittances.map((r) => ({ ...r, allocations: byRemittance.get(r.id) ?? [] }));
}

export async function postHmoRemittance(input: {
  schemeId: string;
  remittanceRef: string;
  amount: number;
  receivedAt?: string;
  bankReference?: string;
  notes?: string;
  recordedBy?: string;
  recordedByName: string;
  allocations: Array<{ claimId: string; amount: number }>;
}): Promise<{ remittanceId: string } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { data, error } = await scoped.admin.rpc("nhis_post_remittance", {
    p_hospital_id: scoped.hospitalId,
    p_scheme_id: input.schemeId,
    p_remittance_ref: input.remittanceRef.trim(),
    p_amount: input.amount,
    p_received_at: input.receivedAt ?? new Date().toISOString(),
    p_bank_reference: input.bankReference ?? "",
    p_notes: input.notes ?? "",
    p_recorded_by: input.recordedBy ?? null,
    p_recorded_by_name: input.recordedByName,
    p_allocations: input.allocations.map((a) => ({ claimId: a.claimId, amount: a.amount })),
  });

  if (error) {
    console.error("[postHmoRemittance]", error.message);
    return { error: error.message };
  }

  return { remittanceId: String((data as { remittanceId?: string }).remittanceId ?? "") };
}
