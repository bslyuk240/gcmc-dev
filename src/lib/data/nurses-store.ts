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
  wardPatients: [
    // Ward patients
    {
      id: "WP-001", patientName: "Kwame Asante", patientId: "PT-8230", unit: "Ward",
      bed: "3A", diagnosis: "Hypertension management", admittedAt: "Mar 13, 2026",
      assignedNurse: "Nurse Patricia", priority: "Stable", status: "Active",
      doctorInCharge: "Dr. Smith",
      vitals: { bp: "138/88", pulse: "78", temp: "36.8", spo2: "98%", recordedAt: "08:00 AM", recordedBy: "Nurse Patricia" },
      labTestsOrdered: 1, medsScheduled: 2, lastVitalsAt: "08:00 AM · Mar 15",
    },
    {
      id: "WP-002", patientName: "Ama Owusu", patientId: "PT-8235", unit: "Ward",
      bed: "3B", diagnosis: "Post-operative recovery (Appendectomy)", admittedAt: "Mar 14, 2026",
      assignedNurse: "Nurse Grace", priority: "Watch", status: "Active",
      doctorInCharge: "Dr. Amaka Osei",
      vitals: { bp: "118/76", pulse: "82", temp: "37.2", spo2: "97%", recordedAt: "09:30 AM", recordedBy: "Nurse Grace" },
      labTestsOrdered: 2, medsScheduled: 3, lastVitalsAt: "09:30 AM · Mar 15",
    },
    {
      id: "WP-003", patientName: "Efua Boateng", patientId: "PT-8232", unit: "Ward",
      bed: "4A", diagnosis: "Type 2 diabetes — blood sugar management", admittedAt: "Mar 12, 2026",
      assignedNurse: "Nurse Grace", priority: "Stable", status: "Active",
      doctorInCharge: "Dr. Mensah",
      vitals: { bp: "124/82", pulse: "74", temp: "36.6", spo2: "99%", recordedAt: "08:30 AM", recordedBy: "Nurse Grace" },
      medsScheduled: 4, lastVitalsAt: "08:30 AM · Mar 15",
    },
    {
      id: "WP-004", patientName: "Yaw Darko", patientId: "PT-8231", unit: "Ward",
      bed: "4B", diagnosis: "Community-acquired pneumonia", admittedAt: "Mar 14, 2026",
      assignedNurse: "Nurse Patricia", priority: "Watch", status: "Active",
      doctorInCharge: "Dr. Osei",
      vitals: { bp: "130/85", pulse: "95", temp: "38.4", spo2: "94%", recordedAt: "07:45 AM", recordedBy: "Nurse Patricia" },
      labTestsOrdered: 1, medsScheduled: 3, lastVitalsAt: "07:45 AM · Mar 15",
    },
    // ICU patients
    {
      id: "WP-005", patientName: "Kofi Mensah", patientId: "PT-8236", unit: "ICU",
      bed: "ICU-1", diagnosis: "Acute MI — post-resuscitation monitoring", admittedAt: "Mar 15, 2026",
      assignedNurse: "Nurse Sandra (ICU)", priority: "Critical", status: "Active",
      doctorInCharge: "Dr. Kwame Mensah",
      vitals: { bp: "160/100", pulse: "110", temp: "37.8", spo2: "92%", recordedAt: "10:00 AM", recordedBy: "Nurse Sandra" },
      labTestsOrdered: 4, medsScheduled: 6, lastVitalsAt: "10:00 AM · Mar 15",
      notes: "Continuous cardiac monitoring. Q1H vitals. Alert doctor immediately if SpO2 <90% or BP >180.",
    },
    {
      id: "WP-006", patientName: "Mary Ibrahim", patientId: "PT-8233", unit: "ICU",
      bed: "ICU-2", diagnosis: "Severe sepsis — septic shock stabilisation", admittedAt: "Mar 14, 2026",
      assignedNurse: "Nurse Sandra (ICU)", priority: "Critical", status: "Active",
      doctorInCharge: "Dr. Smith",
      vitals: { bp: "88/56", pulse: "120", temp: "39.1", spo2: "91%", recordedAt: "10:05 AM", recordedBy: "Nurse Sandra" },
      labTestsOrdered: 5, medsScheduled: 8, lastVitalsAt: "10:05 AM · Mar 15",
      notes: "Vasopressor support. Strict input/output monitoring. GCS Q2H.",
    },
    // Emergency patients
    {
      id: "WP-007", patientName: "Joseph James", patientId: "PT-8240", unit: "Emergency",
      bed: "ER-1", diagnosis: "Suspected meningitis — fever + neck stiffness", admittedAt: "Mar 15, 2026",
      assignedNurse: "Nurse Tom", priority: "Critical", status: "Active",
      doctorInCharge: "Dr. Kalu",
      vitals: { bp: "145/95", pulse: "106", temp: "39.8", spo2: "95%", recordedAt: "10:45 AM", recordedBy: "Nurse Tom" },
      labTestsOrdered: 2, medsScheduled: 2, lastVitalsAt: "10:45 AM · Mar 15",
    },
    {
      id: "WP-008", patientName: "Alice Thompson", patientId: "PT-8234", unit: "Emergency",
      bed: "ER-2", diagnosis: "Road traffic accident — laceration and suspected fracture", admittedAt: "Mar 15, 2026",
      assignedNurse: "Nurse Tom", priority: "High", status: "Active",
      doctorInCharge: "Dr. Robert Smith",
      vitals: { bp: "110/70", pulse: "98", temp: "36.5", spo2: "97%", recordedAt: "11:00 AM", recordedBy: "Nurse Tom" },
      labTestsOrdered: 1, medsScheduled: 1, lastVitalsAt: "11:00 AM · Mar 15",
    },
  ],
  procedures: [
    {
      id: "NP-001", patientName: "Ama Owusu", patientId: "PT-8235", unit: "Ward",
      procedureType: "Wound Care", description: "Post-op wound dressing change — abdomen", performedBy: "Nurse Grace",
      performedAt: "09:00 AM · Mar 15, 2026", amount: 40, billStatus: "Billed",
    },
    {
      id: "NP-002", patientName: "Kwame Asante", patientId: "PT-8230", unit: "Ward",
      procedureType: "IV Access", description: "IV cannula insertion — right antecubital", performedBy: "Nurse Patricia",
      performedAt: "08:15 AM · Mar 15, 2026", amount: 30, billStatus: "Paid",
    },
    {
      id: "NP-003", patientName: "Kofi Mensah", patientId: "PT-8236", unit: "ICU",
      procedureType: "Catheter", description: "Urinary catheter insertion for intake/output monitoring", performedBy: "Nurse Sandra",
      performedAt: "06:30 AM · Mar 15, 2026", amount: 60, billStatus: "Billed",
    },
    {
      id: "NP-004", patientName: "Joseph James", patientId: "PT-8240", unit: "Emergency",
      procedureType: "Injection", description: "IV Ceftriaxone administration — emergency antibiotic", performedBy: "Nurse Tom",
      performedAt: "10:50 AM · Mar 15, 2026", amount: 25, billStatus: "Pending",
    },
    {
      id: "NP-005", patientName: "Yaw Darko", patientId: "PT-8231", unit: "Ward",
      procedureType: "Blood Draw", description: "Blood sample collection for FBC and culture", performedBy: "Nurse Patricia",
      performedAt: "07:50 AM · Mar 15, 2026", amount: 15, billStatus: "Paid",
    },
  ],
  sampleRequests: [
    {
      id: "NSR-001", patientName: "Kofi Mensah", patientId: "PT-8236", unit: "ICU",
      testName: "Arterial Blood Gas (ABG)", testCode: "ABG", sampleType: "Arterial Blood",
      collectedBy: "Nurse Sandra", collectedAt: "06:00 AM · Mar 15, 2026",
      status: "Sent to Lab", priority: "STAT", orderedBy: "Dr. Kwame Mensah",
      orderedAt: "05:50 AM · Mar 15, 2026",
    },
    {
      id: "NSR-002", patientName: "Mary Ibrahim", patientId: "PT-8233", unit: "ICU",
      testName: "Full Blood Count (FBC)", testCode: "FBC", sampleType: "EDTA Blood",
      collectedBy: "Nurse Sandra", collectedAt: "06:10 AM · Mar 15, 2026",
      status: "Sent to Lab", priority: "STAT", orderedBy: "Dr. Smith",
      orderedAt: "06:00 AM · Mar 15, 2026",
    },
    {
      id: "NSR-003", patientName: "Yaw Darko", patientId: "PT-8231", unit: "Ward",
      testName: "Blood Culture & Sensitivity", testCode: "BCXS", sampleType: "Blood",
      status: "Ordered", priority: "Urgent", orderedBy: "Dr. Osei",
      orderedAt: "07:45 AM · Mar 15, 2026",
    },
    {
      id: "NSR-004", patientName: "Ama Owusu", patientId: "PT-8235", unit: "Ward",
      testName: "Urinalysis", testCode: "UA", sampleType: "Mid-stream Urine",
      collectedBy: "Nurse Grace", collectedAt: "09:45 AM · Mar 15, 2026",
      status: "Collected", priority: "Routine", orderedBy: "Dr. Amaka Osei",
      orderedAt: "09:00 AM · Mar 15, 2026",
    },
  ],
  icuVitals: [
    {
      id: "IV-001", patientId: "PT-8236", patientName: "Kofi Mensah",
      bp: "160/100", pulse: "110", temp: "37.8", spo2: "92%", gcs: "12", urine: "30ml/hr", rrRate: "24",
      recordedBy: "Nurse Sandra", recordedAt: "10:00 AM · Mar 15, 2026",
      notes: "SpO2 slightly improved from 89% at 09:00. Suctioning done. Continues on O2 at 4L/min.",
    },
    {
      id: "IV-002", patientId: "PT-8236", patientName: "Kofi Mensah",
      bp: "158/98", pulse: "108", temp: "37.9", spo2: "89%", gcs: "11", urine: "25ml/hr", rrRate: "26",
      recordedBy: "Nurse Sandra", recordedAt: "09:00 AM · Mar 15, 2026",
      notes: "SpO2 dropped. O2 increased to 4L/min. Dr. Mensah notified.",
    },
    {
      id: "IV-003", patientId: "PT-8233", patientName: "Mary Ibrahim",
      bp: "88/56", pulse: "120", temp: "39.1", spo2: "91%", gcs: "13", urine: "15ml/hr", rrRate: "28",
      recordedBy: "Nurse Sandra", recordedAt: "10:05 AM · Mar 15, 2026",
      notes: "Oliguria persisting. Noradrenaline infusion running. Fluid bolus given per Dr. Smith's orders.",
    },
  ],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_nurses_store";

function loadState(): NursesStoreState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as NursesStoreState;
  } catch { /* ignore */ }
  return SEED;
}

function saveState(s: NursesStoreState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
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

let _synced = false;
export async function syncNursesFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const { fetchWardPatients, fetchNursingProcedures, fetchNurseSampleRequests, fetchICUVitals } = await import("@/lib/supabase/db");
    const [wardPatients, procedures, sampleRequests, icuVitals] = await Promise.all([
      fetchWardPatients(), fetchNursingProcedures(), fetchNurseSampleRequests(), fetchICUVitals(),
    ]);
    if (wardPatients.length || procedures.length || sampleRequests.length || icuVitals.length) {
      _state = { wardPatients, procedures, sampleRequests, icuVitals };
      saveState(_state);
      listeners.forEach((l) => l());
      _synced = true;
    }
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
  _state = SEED;
  saveState(SEED);
  listeners.forEach((l) => l());
}
