/**
 * @deprecated Use @/lib/nhis/client instead. Thin compatibility layer for legacy imports.
 */
export type {
  HmoScheme,
  HmoTariff,
  HmoEnrollment,
  HmoClaim,
  HmoClaimService,
  HmoRegistration,
} from "@/modules/nhis/types";

import {
  buildHmoClaimApi,
  createHmoEnrollment,
  deleteHmoTariff,
  fetchHmoClaims,
  fetchHmoEnrollments,
  fetchHmoSchemes,
  fetchHmoTariffs,
  fetchPendingHmoRegistrations,
  saveHmoScheme,
  saveHmoTariff,
  transitionHmoClaimApi,
  updateHmoEnrollmentApi,
} from "@/lib/nhis/client";
import type { HmoClaim, HmoEnrollment, HmoScheme, HmoTariff } from "@/modules/nhis/types";

export async function syncNhisFromSupabase(_force = false) {
  /* no-op — useNhisStore reloads from API */
}

export function subscribeNhisStore(_fn: () => void) {
  return () => {};
}

export function getNhisSchemes(): HmoScheme[] { return []; }
export function getNhisTariffs(): HmoTariff[] { return []; }
export function getNhisEnrollments(): HmoEnrollment[] { return []; }
export function getNhisClaims(): HmoClaim[] { return []; }
export function getNhisRegistrations() { return []; }

export async function addHmoScheme(scheme: Omit<HmoScheme, "id" | "createdAt" | "hospitalId">) {
  return saveHmoScheme(scheme);
}

export async function updateHmoScheme(id: string, patch: Partial<HmoScheme>) {
  const schemes = await fetchHmoSchemes();
  const current = schemes.find((s) => s.id === id);
  if (!current) throw new Error("Scheme not found");
  return saveHmoScheme({ ...current, ...patch, id });
}

export async function addHmoTariff(tariff: Omit<HmoTariff, "id">) {
  return saveHmoTariff(tariff);
}

export async function updateHmoTariff(id: string, patch: Partial<HmoTariff>) {
  const tariffs = await fetchHmoTariffs();
  const current = tariffs.find((t) => t.id === id);
  if (!current) throw new Error("Tariff not found");
  return saveHmoTariff({ ...current, ...patch, id });
}

export { deleteHmoTariff as removeHmoTariff };

export async function addHmoEnrollment(
  e: Omit<HmoEnrollment, "id" | "createdAt" | "schemeName" | "patientName" | "verificationStatus"> & {
    verificationStatus?: HmoEnrollment["verificationStatus"];
  },
  _schemeName?: string,
  _patientName?: string,
) {
  return createHmoEnrollment({
    patientId: e.patientId,
    schemeId: e.schemeId,
    memberId: e.memberId,
    planName: e.planName,
    copayPercentage: e.copayPercentage,
    validFrom: e.validFrom,
    validUntil: e.validUntil,
    authorizedBy: e.authorizedBy,
    notes: e.notes,
    verifyImmediately: true,
  });
}

export async function updateHmoEnrollment(id: string, patch: Partial<HmoEnrollment>) {
  return updateHmoEnrollmentApi(id, patch);
}

export async function addHmoClaim(
  claim: Omit<HmoClaim, "id" | "claimNumber" | "createdAt" | "schemeName" | "patientName">,
  _schemeName?: string,
  _patientName?: string,
) {
  const chargeLineIds = claim.services
    .map((s) => s.chargeId)
    .filter((id) => id && !id.startsWith("SVC-"));
  if (!chargeLineIds.length || !claim.enrollmentId) {
    throw new Error("Use build claim from charge lines.");
  }
  const enrollment = (await fetchHmoEnrollments()).find((e) => e.id === claim.enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");
  const result = await buildHmoClaimApi({
    patientRef: claim.patientId,
    enrollmentId: claim.enrollmentId,
    chargeLineIds,
    notes: claim.notes,
  });
  const claims = await fetchHmoClaims();
  const built = claims.find((c) => c.id === result.claimId);
  if (!built) throw new Error("Claim created but not found");
  return built;
}

export async function updateHmoClaimStatus(id: string, patch: Partial<HmoClaim>) {
  if (patch.status === "submitted") {
    await transitionHmoClaimApi(id, { action: "submit" });
  } else if (patch.status === "approved") {
    await transitionHmoClaimApi(id, { action: "approve" });
  } else if (patch.status === "rejected") {
    await transitionHmoClaimApi(id, { action: "reject", rejectionReason: patch.rejectionReason });
  } else if (patch.status === "paid") {
    await transitionHmoClaimApi(id, { action: "mark_paid", amountPaid: patch.amountPaid });
  } else if (patch.status === "partial") {
    await transitionHmoClaimApi(id, { action: "mark_partial", amountPaid: patch.amountPaid });
  }
}

export function resetNhisStore() {}
