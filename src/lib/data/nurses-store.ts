/**
 * Nurses Bay Cross-Department Shared Store
 *
 * Manages 4 nursing units: Outpatient, Ward, Emergency, ICU
 * Cross-department flows:
 *   Front Desk  → Nurses: patient handoff to triage / ward admission
 *   Doctors     → Nurses: care orders and instructions
 *   Pharmacy    → Nurses: medication supply (see pharmacy-store.ts)
 *   Lab         → Nurses: sample collection support
 *   Accounts    ← Nurses: procedure/service charges
 *   Admin       → monitors all unit data
 *   HR          → manages nurse assignments
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type NursingUnit = "Outpatient" | "Ward" | "Emergency" | "ICU";
export type PatientPriority = "Critical" | "High" | "Watch" | "Stable";
export type AdmissionStatus = "Active" | "Discharged" | "Transferred";

export type WardPatient = {
  id: string;
  patientName: string;
  patientId: string;
  unit: NursingUnit;
  bed: string;
  diagnosis: string;
  admittedAt: string;
  assignedNurse: string;
  priority: PatientPriority;
  status: AdmissionStatus;
  vitals?: {
    bp: string;
    pulse: string;
    temp: string;
    spo2: string;
    recordedAt: string;
    recordedBy: string;
  };
  doctorInCharge?: string;
  notes?: string;
  lastVitalsAt?: string;
  labTestsOrdered?: number;
  medsScheduled?: number;
};

export type NursingProcedure = {
  id: string;
  patientName: string;
  patientId: string;
  unit: NursingUnit;
  procedureType: "Injection" | "Dressing" | "IV Access" | "Catheter" | "Observation" | "Procedure" | "Wound Care" | "Blood Draw" | "Other";
  description: string;
  performedBy: string;
  performedAt: string;
  amount: number;
  billStatus: "Pending" | "Billed" | "Paid" | "Waived";
};

export type NurseSampleRequest = {
  id: string;
  patientName: string;
  patientId: string;
  unit: NursingUnit;
  testName: string;
  testCode: string;
  sampleType: string;
  collectedBy?: string;
  collectedAt?: string;
  status: "Ordered" | "Collected" | "Sent to Lab";
  priority: "Routine" | "Urgent" | "STAT";
  orderedBy: string;
  orderedAt: string;
};

export type ICUVitalsEntry = {
  id: string;
  patientId: string;
  patientName: string;
  bp: string;
  pulse: string;
  temp: string;
  spo2: string;
  gcs?: string;
  urine?: string;
  rrRate?: string;
  recordedBy: string;
  recordedAt: string;
  notes?: string;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type NursesStoreState = {
  wardPatients: WardPatient[];
  procedures: NursingProcedure[];
  sampleRequests: NurseSampleRequest[];
  icuVitals: ICUVitalsEntry[];
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: NursesStoreState = {
  wardPatients: [],
  procedures: [],
  sampleRequests: [],
  icuVitals: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_nurses_store";
const EMPTY_STATE: NursesStoreState = {
  wardPatients: [],
  procedures: [],
  sampleRequests: [],
  icuVitals: [],
};

function loadState(): NursesStoreState {
  return EMPTY_STATE;
}

function saveState(s: NursesStoreState) {
  void s;
}

let _state: NursesStoreState | null = null;

function getState(): NursesStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: NursesStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeNursesStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _lastSync = 0;
export async function syncNursesFromSupabase(force = false) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - _lastSync < 30_000) return;
  _lastSync = now;
  try {
    const { fetchWardPatients, fetchNursingProcedures, fetchNurseSampleRequests, fetchICUVitals } = await import("@/lib/supabase/db");
    const [wardPatients, procedures, sampleRequests, icuVitals] = await Promise.all([
      fetchWardPatients(), fetchNursingProcedures(), fetchNurseSampleRequests(), fetchICUVitals(),
    ]);
    _state = { wardPatients, procedures, sampleRequests, icuVitals };
    listeners.forEach((l) => l());
  } catch { /* keep localStorage/seed */ }
}

// ─── Ward Patients ────────────────────────────────────────────────────────────

export function getWardPatients(): WardPatient[] { return [...getState().wardPatients]; }
export function getPatientsByUnit(unit: NursingUnit): WardPatient[] {
  return getState().wardPatients.filter((p) => p.unit === unit);
}
export function addWardPatient(p: WardPatient) {
  mutate((s) => { s.wardPatients = [p, ...s.wardPatients]; });
  import("@/lib/supabase/db").then(({ insertWardPatient }) => insertWardPatient(p)).catch(() => {});
}
export function updateWardPatient(id: string, updates: Partial<WardPatient>) {
  mutate((s) => { s.wardPatients = s.wardPatients.map((p) => p.id === id ? { ...p, ...updates } : p); });
  // persist to Supabase
  const updated = getState().wardPatients.find((p) => p.id === id);
  if (updated) import("@/lib/supabase/db").then(({ insertWardPatient }) => insertWardPatient(updated)).catch(() => {});
}

// ─── Procedures ───────────────────────────────────────────────────────────────

export function getNursingProcedures(): NursingProcedure[] { return [...getState().procedures]; }
export function addNursingProcedure(p: NursingProcedure) {
  mutate((s) => { s.procedures = [p, ...s.procedures]; });
  import("@/lib/supabase/db").then(({ insertNursingProcedure }) => insertNursingProcedure(p)).catch(() => {});
}
export function updateProcedureBillStatus(id: string, billStatus: NursingProcedure["billStatus"]) {
  mutate((s) => { s.procedures = s.procedures.map((p) => p.id === id ? { ...p, billStatus } : p); });
}

// ─── Sample Requests ──────────────────────────────────────────────────────────

export function getNurseSampleRequests(): NurseSampleRequest[] { return [...getState().sampleRequests]; }
export function addNurseSampleRequest(r: NurseSampleRequest) {
  mutate((s) => { s.sampleRequests = [r, ...s.sampleRequests]; });
}
export function updateNurseSampleRequest(id: string, updates: Partial<NurseSampleRequest>) {
  mutate((s) => { s.sampleRequests = s.sampleRequests.map((r) => r.id === id ? { ...r, ...updates } : r); });
}

// ─── ICU Vitals ───────────────────────────────────────────────────────────────

export function getICUVitals(): ICUVitalsEntry[] { return [...getState().icuVitals]; }
export function addICUVitals(entry: ICUVitalsEntry) {
  mutate((s) => { s.icuVitals = [entry, ...s.icuVitals]; });
  import("@/lib/supabase/db").then(({ insertICUVitals }) => insertICUVitals(entry)).catch(() => {});
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export function getNursesMetrics() {
  const s = getState();
  const active = s.wardPatients.filter((p) => p.status === "Active");

  return {
    totalActive: active.length,
    outpatientCount: active.filter((p) => p.unit === "Outpatient").length,
    wardCount: active.filter((p) => p.unit === "Ward").length,
    emergencyCount: active.filter((p) => p.unit === "Emergency").length,
    icuCount: active.filter((p) => p.unit === "ICU").length,
    criticalCount: active.filter((p) => p.priority === "Critical").length,
    watchCount: active.filter((p) => p.priority === "Watch").length,
    pendingProcedureBills: s.procedures.filter((p) => p.billStatus === "Pending").length,
    procedureBillValue: s.procedures.filter((p) => p.billStatus === "Pending").reduce((sum, p) => sum + p.amount, 0),
    samplesPending: s.sampleRequests.filter((r) => r.status === "Ordered").length,
  };
}

export function resetNursesStore() {
  _state = EMPTY_STATE;
  listeners.forEach((l) => l());
}
