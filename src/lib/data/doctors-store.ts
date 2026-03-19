/**
 * Doctors Cross-Department Store
 *
 * Doctors are the clinical decision engine.
 * Key flows:
 *   Front Desk → Nurses (Outpatient queue) → Doctors (consultation)
 *   Doctors → Lab (test orders) → results returned
 *   Doctors → Pharmacy (prescriptions) → dispensed
 *   Doctors → Accounts (consultation fees) → payment
 *   Doctors → Nurses (admission, care instructions)
 *   HR manages doctor employment records
 *   Admin monitors clinical performance
 */

export type ConsultType = "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal" | "Paediatric";
export type ConsultStatus = "In Progress" | "Completed" | "Awaiting Results" | "Admitted";
export type AdmissionUnit = "Ward" | "ICU" | "Emergency";

export type DoctorProfile = {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  status: "On Duty" | "Off Duty" | "On Leave";
  consultationsToday: number;
  avgConsultMins: number;
};

export type ConsultationRecord = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  consultType: ConsultType;
  date: string;
  time: string;
  status: ConsultStatus;
  chiefComplaint: string;
  diagnosis?: string;
  notes?: string;
  rxWritten: boolean;
  labOrdered: boolean;
  admissionOrdered: boolean;
  admissionUnit?: AdmissionUnit;
  consultFee: number;
  feePaid: boolean;
};

export type AdmissionOrder = {
  id: string;
  patientName: string;
  patientId: string;
  orderedBy: string;
  unit: AdmissionUnit;
  reason: string;
  orderedAt: string;
  status: "Pending" | "Admitted" | "Discharged";
};

// ─── Store State ──────────────────────────────────────────────────────────────

type DoctorsStoreState = {
  doctors: DoctorProfile[];
  consultations: ConsultationRecord[];
  admissionOrders: AdmissionOrder[];
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: DoctorsStoreState = {
  doctors: [],
  consultations: [],
  admissionOrders: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_doctors_store";
const EMPTY_STATE: DoctorsStoreState = { doctors: [], consultations: [], admissionOrders: [] };

function loadState(): DoctorsStoreState {
  return EMPTY_STATE;
}

function saveState(s: DoctorsStoreState) {
  void s;
}

let _state: DoctorsStoreState | null = null;
function getState(): DoctorsStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: DoctorsStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeDoctorsStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _lastSync = 0;
export async function syncDoctorsFromSupabase(force = false) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - _lastSync < 30_000) return;
  _lastSync = now;
  try {
    const { fetchDoctors, fetchConsultations, fetchAdmissionOrders } = await import("@/lib/supabase/db");
    const [doctors, consultations, admissionOrders] = await Promise.all([
      fetchDoctors(),
      fetchConsultations(),
      fetchAdmissionOrders(),
    ]);
    _state = { doctors, consultations, admissionOrders };
    listeners.forEach((l) => l());
  } catch { /* Supabase unavailable — keep localStorage/seed data */ }
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export function getDoctors(): DoctorProfile[] { return [...getState().doctors]; }

// ─── Consultations ────────────────────────────────────────────────────────────

export function getConsultations(): ConsultationRecord[] { return [...getState().consultations]; }
export function addConsultation(c: ConsultationRecord) {
  mutate((s) => { s.consultations = [c, ...s.consultations]; });
  import("@/lib/supabase/db").then(({ insertConsultation }) => insertConsultation(c)).catch(() => {});
}
export function updateConsultation(id: string, updates: Partial<ConsultationRecord>) {
  mutate((s) => {
    s.consultations = s.consultations.map((c) => c.id === id ? { ...c, ...updates } : c);
  });
  import("@/lib/supabase/db").then(({ upsertConsultation }) => upsertConsultation(id, updates)).catch(() => {});
}

// ─── Admissions ───────────────────────────────────────────────────────────────

export function getAdmissionOrders(): AdmissionOrder[] { return [...getState().admissionOrders]; }
export function addAdmissionOrder(a: AdmissionOrder) {
  mutate((s) => { s.admissionOrders = [a, ...s.admissionOrders]; });
  import("@/lib/supabase/db").then(({ insertAdmissionOrder }) => insertAdmissionOrder(a)).catch(() => {});
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export function getDoctorsMetrics() {
  const s = getState();
  const todayDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const today = s.consultations.filter((c) => c.date === todayDate);
  const inProgress = today.filter((c) => c.status === "In Progress");
  const awaitingResults = today.filter((c) => c.status === "Awaiting Results");
  const completed = today.filter((c) => c.status === "Completed" || c.status === "Admitted");
  const rxWritten = today.filter((c) => c.rxWritten);
  const labOrdered = today.filter((c) => c.labOrdered);
  const admissionsToday = today.filter((c) => c.admissionOrdered);
  const onDuty = s.doctors.filter((d) => d.status === "On Duty");
  const revenueToday = today.filter((c) => c.feePaid).reduce((sum, c) => sum + c.consultFee, 0);
  const pendingFees = today.filter((c) => !c.feePaid).reduce((sum, c) => sum + c.consultFee, 0);

  return {
    consultationsToday: today.length,
    inProgress: inProgress.length,
    awaitingResults: awaitingResults.length,
    completedToday: completed.length,
    rxWrittenToday: rxWritten.length,
    labOrderedToday: labOrdered.length,
    admissionsToday: admissionsToday.length,
    doctorsOnDuty: onDuty.length,
    totalDoctors: s.doctors.length,
    revenueToday,
    pendingFees,
  };
}
