/**
 * NHIS / HMO Store
 *
 * Manages HMO schemes, tariffs, patient enrollments, and claims.
 * Follows the exact same module-level singleton pattern as accounts-store.ts.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HmoScheme = {
  id: string;
  name: string;
  code: string;
  type: "capitation" | "fee_for_service";
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
};

export type HmoTariff = {
  id: string;
  schemeId: string;
  serviceCategory: "consultation" | "lab" | "pharmacy" | "nursing" | "procedure" | "admission" | "other";
  serviceName: string;
  hmoPrice: number;
  copayType: "percentage" | "fixed";
  copayValue: number;
  isActive: boolean;
  notes?: string;
};

export type HmoEnrollment = {
  id: string;
  patientId: string;
  patientName: string;
  schemeId: string;
  schemeName: string;
  memberId: string;
  planName?: string;
  copayPercentage: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  authorizedBy?: string;
  notes?: string;
  createdAt: string;
};

export type HmoClaimService = {
  type: string;
  chargeId: string;
  description: string;
  amount: number;
  hmoAmount: number;
  copay: number;
};

export type HmoClaim = {
  id: string;
  claimNumber: string;
  schemeId: string;
  schemeName: string;
  patientId: string;
  patientName: string;
  enrollmentId?: string;
  services: HmoClaimService[];
  totalCost: number;
  copayAmount: number;
  hmoAmount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "paid" | "partial";
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  amountPaid?: number;
  notes?: string;
  createdAt: string;
};

export type HmoRegistration = {
  id: string;
  /** UUID — the `id` column of patient_registrations; used as FK in patient_hmo_enrollments */
  patientId: string;
  /** Display patient ID e.g. "P-73472" */
  patientDisplayId: string;
  patientName: string;
  primaryHmoSchemeId?: string;
  registeredAt: string;
  registeredBy: string;
  hasHmo: boolean;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type NhisState = {
  schemes: HmoScheme[];
  tariffs: HmoTariff[];
  enrollments: HmoEnrollment[];
  claims: HmoClaim[];
  hmoRegistrations: HmoRegistration[];
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_nhis_store";
const EMPTY_STATE: NhisState = {
  schemes: [],
  tariffs: [],
  enrollments: [],
  claims: [],
  hmoRegistrations: [],
};

function loadState(): NhisState {
  if (typeof window === "undefined") return { ...EMPTY_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NhisState) : { ...EMPTY_STATE };
  } catch { return { ...EMPTY_STATE }; }
}

function saveState(state: NhisState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

let _state: NhisState | null = null;

function getState(): NhisState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: NhisState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeNhisStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getNhisSchemes(): HmoScheme[] { return [...getState().schemes]; }
export function getNhisTariffs(): HmoTariff[] { return [...getState().tariffs]; }
export function getNhisEnrollments(): HmoEnrollment[] { return [...getState().enrollments]; }
export function getNhisClaims(): HmoClaim[] { return [...getState().claims]; }
export function getNhisRegistrations(): HmoRegistration[] { return [...getState().hmoRegistrations]; }

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _lastSync = 0;

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  const merged = new Map<string, T>();
  for (const item of remote) merged.set(item.id, item);
  for (const item of local) merged.set(item.id, { ...(merged.get(item.id) ?? {}), ...item });
  return Array.from(merged.values());
}

export async function syncNhisFromSupabase(force = false) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - _lastSync < 30_000) return;
  _lastSync = now;
  try {
    const {
      fetchHmoSchemes,
      fetchHmoTariffs,
      fetchHmoEnrollments,
      fetchHmoClaims,
      fetchHmoPatientRegistrations,
    } = await import("@/lib/supabase/db");
    const [schemes, tariffs, enrollments, claims, registrations] = await Promise.all([
      fetchHmoSchemes(),
      fetchHmoTariffs(),
      fetchHmoEnrollments(),
      fetchHmoClaims(),
      fetchHmoPatientRegistrations(),
    ]);
    const current = getState();
    _state = {
      schemes: mergeById(schemes, current.schemes),
      tariffs: mergeById(tariffs, current.tariffs),
      enrollments: mergeById(enrollments, current.enrollments),
      claims: mergeById(claims, current.claims),
      hmoRegistrations: mergeById(
        registrations.map((reg) => ({
          id: reg.id,
          // patientId must be the UUID (patient_registrations.id) so it
          // matches patient_hmo_enrollments.patient_id which FKs to that column
          patientId: reg.id,
          patientDisplayId: reg.patientId, // e.g. "P-73472"
          patientName: reg.patientName,
          primaryHmoSchemeId: reg.primaryHmoSchemeId,
          registeredAt: reg.registeredAt,
          registeredBy: reg.registeredBy,
          hasHmo: reg.hasHmo ?? true,
        })),
        current.hmoRegistrations,
      ),
    };
    saveState(_state);
    listeners.forEach((l) => l());
  } catch (err) { console.error("[nhis-store] sync failed:", err); }
}

// ─── HMO Schemes ──────────────────────────────────────────────────────────────

export async function addHmoScheme(scheme: Omit<HmoScheme, "id" | "createdAt">): Promise<HmoScheme> {
  const { insertHmoScheme } = await import("@/lib/supabase/db");
  const created = await insertHmoScheme(scheme);
  mutate((s) => { s.schemes = [created, ...s.schemes]; });
  return created;
}

export async function updateHmoScheme(id: string, patch: Partial<HmoScheme>): Promise<void> {
  const { updateHmoSchemeDb } = await import("@/lib/supabase/db");
  await updateHmoSchemeDb(id, patch);
  mutate((s) => { s.schemes = s.schemes.map((x) => x.id === id ? { ...x, ...patch } : x); });
}

// ─── HMO Tariffs ──────────────────────────────────────────────────────────────

export async function addHmoTariff(tariff: Omit<HmoTariff, "id">): Promise<HmoTariff> {
  const { insertHmoTariff } = await import("@/lib/supabase/db");
  const created = await insertHmoTariff(tariff);
  mutate((s) => { s.tariffs = [created, ...s.tariffs]; });
  return created;
}

export async function updateHmoTariff(id: string, patch: Partial<HmoTariff>): Promise<void> {
  const { updateHmoTariffDb } = await import("@/lib/supabase/db");
  await updateHmoTariffDb(id, patch);
  mutate((s) => { s.tariffs = s.tariffs.map((x) => x.id === id ? { ...x, ...patch } : x); });
}

export async function removeHmoTariff(id: string): Promise<void> {
  const { deleteHmoTariff } = await import("@/lib/supabase/db");
  await deleteHmoTariff(id);
  mutate((s) => { s.tariffs = s.tariffs.filter((x) => x.id !== id); });
}

// ─── HMO Enrollments ──────────────────────────────────────────────────────────

export async function addHmoEnrollment(
  e: Omit<HmoEnrollment, "id" | "createdAt" | "schemeName" | "patientName">,
  schemeName: string,
  patientName: string,
): Promise<HmoEnrollment> {
  const { insertHmoEnrollment } = await import("@/lib/supabase/db");
  const created = await insertHmoEnrollment(e);
  const withNames: HmoEnrollment = { ...created, schemeName, patientName };
  mutate((s) => { s.enrollments = [withNames, ...s.enrollments]; });
  return withNames;
}

export async function updateHmoEnrollment(id: string, patch: Partial<HmoEnrollment>): Promise<void> {
  const { updateHmoEnrollmentDb } = await import("@/lib/supabase/db");
  await updateHmoEnrollmentDb(id, patch);
  mutate((s) => { s.enrollments = s.enrollments.map((x) => x.id === id ? { ...x, ...patch } : x); });
}

// ─── HMO Claims ───────────────────────────────────────────────────────────────

export async function addHmoClaim(
  claim: Omit<HmoClaim, "id" | "claimNumber" | "createdAt" | "schemeName" | "patientName">,
  schemeName: string,
  patientName: string,
): Promise<HmoClaim> {
  const { insertHmoClaim } = await import("@/lib/supabase/db");
  const created = await insertHmoClaim(claim);
  const withNames: HmoClaim = { ...created, schemeName, patientName };
  mutate((s) => { s.claims = [withNames, ...s.claims]; });
  return withNames;
}

export async function updateHmoClaimStatus(id: string, patch: Partial<HmoClaim>): Promise<void> {
  const { updateHmoClaimDb } = await import("@/lib/supabase/db");
  await updateHmoClaimDb(id, patch);
  mutate((s) => { s.claims = s.claims.map((x) => x.id === id ? { ...x, ...patch } : x); });
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function resetNhisStore() {
  _state = { ...EMPTY_STATE };
  listeners.forEach((l) => l());
}
