/**
 * Pharmacy Cross-Department Shared Store
 *
 * Provides in-memory state (backed by localStorage) shared across:
 *   Doctors  → Pharmacy  (prescriptions)
 *   Nurses  ↔ Pharmacy  (nurse medication requests)
 *   Pharmacy → Store     (restock requests)
 *   Pharmacy → Accounts  (billing records)
 *   Pharmacy → Admin     (live metrics)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrescriptionStatus = "Pending" | "Processing" | "Dispensed" | "Cancelled";
export type PrescriptionUrgency = "Routine" | "Urgent";

export type PrescribedDrug = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  qty: string;
  unitPrice: number; // ₦
};

export type SharedPrescription = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  department: string;
  urgency: PrescriptionUrgency;
  drugs: PrescribedDrug[];
  notes?: string;
  createdAt: string;
  status: PrescriptionStatus;
  dispensedAt?: string;
  dispensedBy?: string;
  totalCost?: number;
};

export type NurseRequestStatus = "Requested" | "Preparing" | "Ready" | "Collected" | "Cancelled";

export type NurseMedRequest = {
  id: string;
  patientName: string;
  patientId: string;
  ward: string;
  requestedBy: string;
  drug: string;
  dosage: string;
  route: string;
  qty: string;
  urgency: "Routine" | "Urgent" | "STAT";
  notes?: string;
  requestedAt: string;
  status: NurseRequestStatus;
  preparedAt?: string;
  preparedBy?: string;
};

export type PharmacyRestockStatus = "Pending" | "Approved" | "Fulfilled" | "Rejected";

export type PharmacyRestockRequest = {
  id: string;
  drug: string;
  inventoryItemId: string;
  currentStock: number;
  reorderLevel: number;
  qtyRequested: number;
  unit: string;
  urgency: "Routine" | "Urgent" | "Critical";
  requestedBy: string;
  requestedAt: string;
  status: PharmacyRestockStatus;
  notes?: string;
  approvedQty?: number;
  fulfilledAt?: string;
};

export type PharmacyBill = {
  id: string;
  prescriptionId: string;
  patientName: string;
  patientId: string;
  drugs: string;
  totalCost: number;
  dispensedAt: string;
  billStatus: "Pending" | "Paid" | "Waived";
  source: "prescription" | "nurse-request" | "walk-in";
};

// ─── Store State ──────────────────────────────────────────────────────────────

type PharmacyStoreState = {
  prescriptions: SharedPrescription[];
  nurseRequests: NurseMedRequest[];
  restockRequests: PharmacyRestockRequest[];
  bills: PharmacyBill[];
};

// ─── Initial seed data ────────────────────────────────────────────────────────

const SEED: PharmacyStoreState = {
  prescriptions: [],
  nurseRequests: [],
  restockRequests: [],
  bills: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_pharmacy_store";
const EMPTY_STATE: PharmacyStoreState = {
  prescriptions: [],
  nurseRequests: [],
  restockRequests: [],
  bills: [],
};

function loadState(): PharmacyStoreState {
  return EMPTY_STATE;
}

function saveState(state: PharmacyStoreState) {
  void state;
}

let _state: PharmacyStoreState | null = null;

function getState(): PharmacyStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: PharmacyStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

// ─── Subscription (for re-renders) ───────────────────────────────────────────

const listeners = new Set<() => void>();

export function subscribePharmacyStore(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _synced = false;
export async function syncPharmacyFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const { fetchPrescriptions, fetchNurseMedRequests, fetchPharmacyRestockRequests, fetchPharmacyBills } = await import("@/lib/supabase/db");
    const [prescriptions, nurseRequests, restockRequests, bills] = await Promise.all([
      fetchPrescriptions(),
      fetchNurseMedRequests(),
      fetchPharmacyRestockRequests(),
      fetchPharmacyBills(),
    ]);
    _state = { prescriptions, nurseRequests, restockRequests, bills };
    listeners.forEach((l) => l());
    _synced = true;
  } catch { /* keep localStorage/seed */ }
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export function getPrescriptions(): SharedPrescription[] {
  return [...getState().prescriptions];
}

export function addPrescription(p: SharedPrescription) {
  mutate((s) => { s.prescriptions = [p, ...s.prescriptions]; });
  import("@/lib/supabase/db").then(({ insertPrescription }) => insertPrescription(p)).catch(() => {});
}

export function updatePrescriptionStatus(
  id: string,
  status: PrescriptionStatus,
  extra?: Partial<SharedPrescription>,
) {
  mutate((s) => {
    s.prescriptions = s.prescriptions.map((p) => p.id === id ? { ...p, status, ...extra } : p);
  });
  import("@/lib/supabase/db").then(({ upsertPrescriptionStatus }) => upsertPrescriptionStatus(id, status, extra)).catch(() => {});
}

// ─── Nurse Medication Requests ────────────────────────────────────────────────

export function getNurseRequests(): NurseMedRequest[] {
  return [...getState().nurseRequests];
}

export function addNurseRequest(r: NurseMedRequest) {
  mutate((s) => { s.nurseRequests = [r, ...s.nurseRequests]; });
}

export function updateNurseRequestStatus(
  id: string,
  status: NurseRequestStatus,
  extra?: Partial<NurseMedRequest>,
) {
  mutate((s) => {
    s.nurseRequests = s.nurseRequests.map((r) => r.id === id ? { ...r, status, ...extra } : r);
  });
}

// ─── Restock Requests ─────────────────────────────────────────────────────────

export function getRestockRequests(): PharmacyRestockRequest[] {
  return [...getState().restockRequests];
}

export function addRestockRequest(r: PharmacyRestockRequest) {
  mutate((s) => { s.restockRequests = [r, ...s.restockRequests]; });
}

export function updateRestockStatus(
  id: string,
  status: PharmacyRestockStatus,
  extra?: Partial<PharmacyRestockRequest>,
) {
  mutate((s) => {
    s.restockRequests = s.restockRequests.map((r) => r.id === id ? { ...r, status, ...extra } : r);
  });
}

// ─── Billing Records ──────────────────────────────────────────────────────────

export function getPharmacyBills(): PharmacyBill[] {
  return [...getState().bills];
}

export function addPharmacyBill(bill: PharmacyBill) {
  mutate((s) => { s.bills = [bill, ...s.bills]; });
}

export function updateBillStatus(id: string, billStatus: PharmacyBill["billStatus"]) {
  mutate((s) => {
    s.bills = s.bills.map((b) => (b.id === id ? { ...b, billStatus } : b));
  });
}

// ─── Metrics helper (used by Admin) ──────────────────────────────────────────

export function getPharmacyMetrics() {
  const s = getState();
  const dispensedToday = s.prescriptions.filter((p) => p.status === "Dispensed");
  const pendingRx = s.prescriptions.filter((p) => p.status === "Pending" || p.status === "Processing");
  const urgentRx = s.prescriptions.filter((p) => p.status !== "Dispensed" && p.urgency === "Urgent");
  const pendingBills = s.bills.filter((b) => b.billStatus === "Pending");
  const totalRevenue = s.bills.filter((b) => b.billStatus === "Paid").reduce((sum, b) => sum + b.totalCost, 0);
  const pendingRestocks = s.restockRequests.filter((r) => r.status === "Pending");
  const nurseReadyRequests = s.nurseRequests.filter((r) => r.status === "Ready");

  return {
    dispensedToday: dispensedToday.length,
    pendingPrescriptions: pendingRx.length,
    urgentPrescriptions: urgentRx.length,
    pendingBills: pendingBills.length,
    pendingBillValue: pendingBills.reduce((sum, b) => sum + b.totalCost, 0),
    revenueCollected: totalRevenue,
    pendingRestocks: pendingRestocks.length,
    nurseReadyRequests: nurseReadyRequests.length,
  };
}

// ─── Pharmacy Drug Catalog (shared with Doctors for prescriptions) ────────────

export type PharmacyDrugItem = {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  defaultDosage: string;
  unit: string; // "tab", "cap", "vial", "bag", "inhaler", etc.
};

export const PHARMACY_DRUG_LIST: PharmacyDrugItem[] = [
  { id: "INV-001", name: "Paracetamol 500mg",           category: "Analgesic",           unitPrice: 0.50, defaultDosage: "500mg",      unit: "tab" },
  { id: "INV-002", name: "Amoxicillin 500mg",           category: "Antibiotic",           unitPrice: 1.80, defaultDosage: "500mg",      unit: "cap" },
  { id: "INV-003", name: "Metformin 850mg",             category: "Antidiabetic",         unitPrice: 1.20, defaultDosage: "850mg",      unit: "tab" },
  { id: "INV-004", name: "Lisinopril 10mg",             category: "Antihypertensive",     unitPrice: 2.50, defaultDosage: "10mg",       unit: "tab" },
  { id: "INV-005", name: "Atorvastatin 20mg",           category: "Lipid-lowering",       unitPrice: 3.00, defaultDosage: "20mg",       unit: "tab" },
  { id: "INV-006", name: "Amlodipine 5mg",              category: "Antihypertensive",     unitPrice: 1.60, defaultDosage: "5mg",        unit: "tab" },
  { id: "INV-007", name: "Aspirin 75mg",                category: "Analgesic",            unitPrice: 0.50, defaultDosage: "75mg",       unit: "tab" },
  { id: "INV-008", name: "Metronidazole 400mg",         category: "Antibiotic",           unitPrice: 1.50, defaultDosage: "400mg",      unit: "tab" },
  { id: "INV-009", name: "Ciprofloxacin 500mg",         category: "Antibiotic",           unitPrice: 3.50, defaultDosage: "500mg",      unit: "tab" },
  { id: "INV-010", name: "Omeprazole 20mg",             category: "Antacid / PPI",        unitPrice: 2.20, defaultDosage: "20mg",       unit: "cap" },
  { id: "INV-011", name: "Prednisolone 5mg",            category: "Corticosteroid",       unitPrice: 0.80, defaultDosage: "5mg",        unit: "tab" },
  { id: "INV-012", name: "Ibuprofen 400mg",             category: "NSAID",                unitPrice: 0.90, defaultDosage: "400mg",      unit: "tab" },
  { id: "INV-013", name: "Diclofenac 50mg",             category: "NSAID",                unitPrice: 1.00, defaultDosage: "50mg",       unit: "tab" },
  { id: "INV-014", name: "Azithromycin 500mg",          category: "Antibiotic",           unitPrice: 4.50, defaultDosage: "500mg",      unit: "tab" },
  { id: "INV-015", name: "IV Amoxicillin 1g",           category: "IV Antibiotic",        unitPrice: 8.50, defaultDosage: "1g",         unit: "vial" },
  { id: "INV-016", name: "IV Metronidazole 500mg",      category: "IV Antibiotic",        unitPrice: 6.00, defaultDosage: "500mg",      unit: "bag" },
  { id: "INV-017", name: "Ferrous Sulphate 200mg",      category: "Supplement",           unitPrice: 0.30, defaultDosage: "200mg",      unit: "tab" },
  { id: "INV-018", name: "Folic Acid 5mg",              category: "Supplement",           unitPrice: 0.20, defaultDosage: "5mg",        unit: "tab" },
  { id: "INV-019", name: "Artemether-Lumefantrine",     category: "Antimalarial",         unitPrice: 2.80, defaultDosage: "20/120mg",   unit: "tab" },
  { id: "INV-020", name: "Salbutamol Inhaler",          category: "Bronchodilator",       unitPrice: 15.00,defaultDosage: "100mcg/dose",unit: "inhaler" },
  { id: "INV-021", name: "Hydrochlorothiazide 25mg",    category: "Antihypertensive",     unitPrice: 0.60, defaultDosage: "25mg",       unit: "tab" },
  { id: "INV-022", name: "Spironolactone 25mg",         category: "Diuretic",             unitPrice: 1.40, defaultDosage: "25mg",       unit: "tab" },
  { id: "INV-023", name: "Furosemide 40mg",             category: "Diuretic",             unitPrice: 0.70, defaultDosage: "40mg",       unit: "tab" },
  { id: "INV-024", name: "Doxycycline 100mg",           category: "Antibiotic",           unitPrice: 2.00, defaultDosage: "100mg",      unit: "cap" },
  { id: "INV-025", name: "Ceftriaxone 1g IV",           category: "IV Antibiotic",        unitPrice: 12.00,defaultDosage: "1g",         unit: "vial" },
  { id: "INV-026", name: "IV Normal Saline 500ml",      category: "IV Fluid",             unitPrice: 5.00, defaultDosage: "500ml",      unit: "bag" },
  { id: "INV-027", name: "IV Dextrose 5% 500ml",        category: "IV Fluid",             unitPrice: 5.50, defaultDosage: "500ml",      unit: "bag" },
  { id: "INV-028", name: "Chlorphenamine 4mg",          category: "Antihistamine",        unitPrice: 0.40, defaultDosage: "4mg",        unit: "tab" },
  { id: "INV-029", name: "Tramadol 50mg",               category: "Opioid Analgesic",     unitPrice: 1.80, defaultDosage: "50mg",       unit: "cap" },
  { id: "INV-030", name: "Glibenclamide 5mg",           category: "Antidiabetic",         unitPrice: 0.90, defaultDosage: "5mg",        unit: "tab" },
];

export function getPharmacyDrugList(): PharmacyDrugItem[] {
  return PHARMACY_DRUG_LIST;
}

// ─── Reset (for dev/testing) ──────────────────────────────────────────────────
export function resetPharmacyStore() {
  _state = EMPTY_STATE;
  listeners.forEach((l) => l());
}
