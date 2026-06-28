"use client";

import type {
  HmoClaim,
  HmoEnrollment,
  HmoPreAuthorization,
  HmoRegistration,
  HmoRemittance,
  HmoScheme,
  HmoTariff,
  HmoServiceCategory,
  NhisDashboardSummary,
  UnclaimedHmoCharge,
} from "@/modules/nhis/types";

export const NHIS_UPDATED_EVENT = "nhis-updated";

export function notifyNhisUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NHIS_UPDATED_EVENT));
  }
}

async function parseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? "Request failed.");
}

export async function fetchNhisDashboard(): Promise<NhisDashboardSummary> {
  const res = await fetch("/api/nhis/dashboard");
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchHmoSchemes(): Promise<HmoScheme[]> {
  const res = await fetch("/api/nhis/schemes");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.schemes as HmoScheme[];
}

export async function saveHmoScheme(input: Partial<HmoScheme> & { name: string; code: string; type: HmoScheme["type"] }): Promise<HmoScheme> {
  const res = await fetch("/api/nhis/schemes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.scheme as HmoScheme;
}

export async function fetchHmoTariffs(schemeId?: string): Promise<HmoTariff[]> {
  const params = schemeId ? `?schemeId=${encodeURIComponent(schemeId)}` : "";
  const res = await fetch(`/api/nhis/tariffs${params}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.tariffs as HmoTariff[];
}

export async function saveHmoTariff(input: Omit<HmoTariff, "id"> & { id?: string }): Promise<HmoTariff> {
  const res = await fetch("/api/nhis/tariffs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.tariff as HmoTariff;
}

export async function deleteHmoTariff(id: string): Promise<void> {
  const res = await fetch(`/api/nhis/tariffs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
}

export async function fetchHmoEnrollments(filter?: {
  verificationStatus?: string;
  schemeId?: string;
}): Promise<HmoEnrollment[]> {
  const params = new URLSearchParams();
  if (filter?.verificationStatus) params.set("verificationStatus", filter.verificationStatus);
  if (filter?.schemeId) params.set("schemeId", filter.schemeId);
  const res = await fetch(`/api/nhis/enrollments?${params.toString()}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.enrollments as HmoEnrollment[];
}

export async function fetchPendingHmoRegistrations(): Promise<HmoRegistration[]> {
  const res = await fetch("/api/nhis/enrollments?view=pending-registrations");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.registrations as HmoRegistration[];
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
}): Promise<HmoEnrollment> {
  const res = await fetch("/api/nhis/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.enrollment as HmoEnrollment;
}

export async function updateHmoEnrollmentApi(id: string, patch: Partial<HmoEnrollment>): Promise<HmoEnrollment> {
  const res = await fetch("/api/nhis/enrollments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.enrollment as HmoEnrollment;
}

export async function verifyHmoEnrollmentApi(
  id: string,
  input: { action: "verify" | "reject" | "suspend"; rejectionReason?: string },
): Promise<HmoEnrollment> {
  const res = await fetch(`/api/nhis/enrollments/${id}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.enrollment as HmoEnrollment;
}

export async function fetchHmoClaims(filter?: { status?: string; schemeId?: string }): Promise<HmoClaim[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.schemeId) params.set("schemeId", filter.schemeId);
  const res = await fetch(`/api/nhis/claims?${params.toString()}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.claims as HmoClaim[];
}

export async function fetchUnclaimedHmoCharges(patientId?: string): Promise<UnclaimedHmoCharge[]> {
  const params = new URLSearchParams({ view: "unclaimed-charges" });
  if (patientId) params.set("patientId", patientId);
  const res = await fetch(`/api/nhis/claims?${params.toString()}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.charges as UnclaimedHmoCharge[];
}

export async function buildHmoClaimApi(input: {
  patientRef: string;
  enrollmentId: string;
  chargeLineIds: string[];
  notes?: string;
}): Promise<{ claimId: string; claimNumber: string }> {
  const res = await fetch("/api/nhis/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  return res.json();
}

export async function transitionHmoClaimApi(
  claimId: string,
  input: {
    action: "submit" | "approve" | "reject" | "mark_paid" | "mark_partial";
    rejectionReason?: string;
    amountPaid?: number;
  },
): Promise<{ claimId: string; status: string }> {
  const res = await fetch(`/api/nhis/claims/${claimId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  return res.json();
}

export async function applyHmoTariff(chargeLineId: string) {
  const res = await fetch("/api/nhis/charges/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chargeLineId }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function applyHmoToPatient(patientRef: string) {
  const res = await fetch("/api/nhis/charges/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientRef }),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchHmoRemittances(): Promise<HmoRemittance[]> {
  const res = await fetch("/api/nhis/remittances");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.remittances as HmoRemittance[];
}

export async function postHmoRemittanceApi(input: {
  schemeId: string;
  remittanceRef: string;
  amount: number;
  receivedAt?: string;
  bankReference?: string;
  notes?: string;
  allocations: Array<{ claimId: string; amount: number }>;
}): Promise<{ remittanceId: string }> {
  const res = await fetch("/api/nhis/remittances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  return res.json();
}

export async function fetchHmoPreauthorizations(filter?: {
  status?: string;
  schemeId?: string;
}): Promise<HmoPreAuthorization[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.schemeId) params.set("schemeId", filter.schemeId);
  const qs = params.toString();
  const res = await fetch(`/api/nhis/preauth${qs ? `?${qs}` : ""}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.preauths as HmoPreAuthorization[];
}

export async function createHmoPreauthorization(input: {
  patientRef: string;
  patientName: string;
  serviceCategory: HmoServiceCategory;
  serviceName: string;
  amountCap?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<HmoPreAuthorization> {
  const res = await fetch("/api/nhis/preauth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  const data = await res.json();
  return data.preauth as HmoPreAuthorization;
}

export async function reviewHmoPreauthorizationApi(
  id: string,
  input: {
    action: "approve" | "deny";
    authCode?: string;
    validUntil?: string;
    notes?: string;
  },
): Promise<{ preauthId: string; status: string }> {
  const res = await fetch(`/api/nhis/preauth/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyNhisUpdated();
  return res.json();
}

export async function checkHmoPreauthStatus(
  patientRef: string,
  category: HmoServiceCategory,
): Promise<{
  required: boolean;
  hasEnrollment: boolean;
  approved: boolean;
  pending: boolean;
}> {
  const params = new URLSearchParams({
    check: "status",
    patientRef,
    category,
  });
  const res = await fetch(`/api/nhis/preauth?${params.toString()}`);
  if (!res.ok) await parseError(res);
  return res.json();
}

export function fmtNaira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
