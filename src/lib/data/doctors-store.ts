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
  doctors: [
    { id: "DR-001", name: "Dr. Amaka Osei", specialty: "Obstetrics & Gynaecology", qualifications: "MBChB, FWACS", status: "On Duty", consultationsToday: 8, avgConsultMins: 14 },
    { id: "DR-002", name: "Dr. Kwame Mensah", specialty: "Cardiology", qualifications: "MBChB, FWACP", status: "On Duty", consultationsToday: 6, avgConsultMins: 18 },
    { id: "DR-003", name: "Dr. Chen Lin", specialty: "General Medicine", qualifications: "MBChB", status: "On Duty", consultationsToday: 9, avgConsultMins: 12 },
    { id: "DR-004", name: "Dr. Robert Smith", specialty: "General Surgery", qualifications: "MBChB, FWACS", status: "On Duty", consultationsToday: 5, avgConsultMins: 20 },
    { id: "DR-005", name: "Dr. Kofi Osei", specialty: "Paediatrics", qualifications: "MBChB, FWACP", status: "Off Duty", consultationsToday: 0, avgConsultMins: 15 },
  ],
  consultations: [
    {
      id: "CON-001", patientName: "Alice Thompson", patientId: "PT-8234", doctorName: "Dr. Chen Lin",
      consultType: "General", date: "Mar 15, 2026", time: "10:20", status: "Awaiting Results",
      chiefComplaint: "Fever and headache for 3 days.", diagnosis: "Suspected malaria — await lab",
      notes: "Ordered malaria RDT and FBC. Review results before prescribing.",
      rxWritten: false, labOrdered: true, admissionOrdered: false, consultFee: 100, feePaid: true,
    },
    {
      id: "CON-002", patientName: "Kofi Mensah", patientId: "PT-8236", doctorName: "Dr. Kwame Mensah",
      consultType: "Specialist", date: "Mar 15, 2026", time: "10:05", status: "In Progress",
      chiefComplaint: "Chest pain and shortness of breath.",
      notes: "ECG ordered. BP: 150/95. Possible hypertensive crisis.",
      rxWritten: false, labOrdered: true, admissionOrdered: false, consultFee: 250, feePaid: false,
    },
    {
      id: "CON-003", patientName: "Mary Ibrahim", patientId: "PT-8233", doctorName: "Dr. Amaka Osei",
      consultType: "Antenatal", date: "Mar 15, 2026", time: "09:50", status: "Completed",
      chiefComplaint: "28-week antenatal visit.",
      diagnosis: "Normal pregnancy — 28 weeks.",
      notes: "BP normal. Foetal heart rate good. Ferrous sulphate + folic acid prescribed.",
      rxWritten: true, labOrdered: false, admissionOrdered: false, consultFee: 120, feePaid: true,
    },
    {
      id: "CON-004", patientName: "Joseph James", patientId: "PT-8240", doctorName: "Dr. Chen Lin",
      consultType: "General", date: "Mar 15, 2026", time: "09:30", status: "Completed",
      chiefComplaint: "Abdominal pain.",
      diagnosis: "Peptic ulcer disease.",
      notes: "Omeprazole + antacids prescribed. Lifestyle advice given. Review in 2 weeks.",
      rxWritten: true, labOrdered: false, admissionOrdered: false, consultFee: 100, feePaid: true,
    },
    {
      id: "CON-005", patientName: "Emma Wilson", patientId: "PT-8250", doctorName: "Dr. Robert Smith",
      consultType: "Emergency", date: "Mar 15, 2026", time: "09:10", status: "Admitted",
      chiefComplaint: "Acute appendicitis — severe RIF pain.",
      diagnosis: "Acute appendicitis.",
      notes: "IV antibiotics started. Referred to surgery. Admitted to ward.",
      rxWritten: true, labOrdered: true, admissionOrdered: true, admissionUnit: "Ward", consultFee: 200, feePaid: false,
    },
    {
      id: "CON-006", patientName: "David Miller", patientId: "PT-8252", doctorName: "Dr. Kwame Mensah",
      consultType: "Follow-up", date: "Mar 14, 2026", time: "14:30", status: "Completed",
      chiefComplaint: "Hypertension follow-up.",
      diagnosis: "Hypertension — stable on medication.",
      rxWritten: true, labOrdered: false, admissionOrdered: false, consultFee: 60, feePaid: true,
    },
  ],
  admissionOrders: [
    { id: "ADM-001", patientName: "Emma Wilson", patientId: "PT-8250", orderedBy: "Dr. Robert Smith", unit: "Ward", reason: "Acute appendicitis — surgical prep.", orderedAt: "09:15 AM · Mar 15, 2026", status: "Admitted" },
    { id: "ADM-002", patientName: "Kofi Asante", patientId: "PT-8199", orderedBy: "Dr. Kwame Mensah", unit: "ICU", reason: "Hypertensive emergency with cardiac signs.", orderedAt: "Mar 14, 2026", status: "Admitted" },
    { id: "ADM-003", patientName: "Grace Owusu", patientId: "PT-8201", orderedBy: "Dr. Chen Lin", unit: "Ward", reason: "Severe anaemia — transfusion required.", orderedAt: "Mar 13, 2026", status: "Discharged" },
  ],
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

let _synced = false;
export async function syncDoctorsFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const { fetchDoctors, fetchConsultations, fetchAdmissionOrders } = await import("@/lib/supabase/db");
    const [doctors, consultations, admissionOrders] = await Promise.all([
      fetchDoctors(),
      fetchConsultations(),
      fetchAdmissionOrders(),
    ]);
    _state = { doctors, consultations, admissionOrders };
    listeners.forEach((l) => l());
    _synced = true;
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
  const today = s.consultations.filter((c) => c.date === "Mar 15, 2026");
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
