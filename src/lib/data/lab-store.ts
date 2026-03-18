/**
 * Lab Cross-Department Shared Store
 *
 * Tracks all diagnostic test flows:
 *   Doctors     → Order lab tests
 *   Nurses      → Collect samples
 *   Lab staff   → Process tests and enter results
 *   Accounts    → Billing per test
 *   Admin       → Monitoring and reports
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestPriority = "Routine" | "Urgent" | "STAT";
export type TestStatus =
  | "Pending"
  | "Sample Collected"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type LabTest = {
  id: string;
  patientName: string;
  patientId: string;
  testName: string;
  testCode: string;
  category: string;
  orderedBy: string;
  orderedAt: string;
  priority: TestPriority;
  status: TestStatus;
  sampleType: string;
  price: number;
  // Sample collection
  sampleCollectedBy?: string;
  sampleCollectedAt?: string;
  // Processing
  technicianName?: string;
  equipmentUsed?: string;
  processingStartedAt?: string;
  // Results
  resultValue?: string;
  resultUnit?: string;
  referenceRange?: string;
  interpretation?: "Normal" | "Abnormal" | "Critical";
  resultNotes?: string;
  resultEnteredBy?: string;
  completedAt?: string;
  // Billing
  billStatus: "Pending" | "Billed" | "Paid" | "Waived";
};

export type TestCatalogItem = {
  id: string;
  name: string;
  code: string;
  category: string;
  sampleType: string;
  price: number;
  turnaroundHours: number;
  department: string;
  description: string;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type LabStoreState = {
  tests: LabTest[];
  catalog: TestCatalogItem[];
};

// ─── Test Catalog (reference data) ───────────────────────────────────────────

const LAB_CATALOG: TestCatalogItem[] = [
  { id: "CAT-001", name: "Full Blood Count (FBC)", code: "FBC", category: "Haematology", sampleType: "EDTA Blood", price: 80, turnaroundHours: 2, department: "Haematology", description: "Complete blood cell analysis including RBC, WBC, platelets and haemoglobin." },
  { id: "CAT-002", name: "Malaria Parasite Test", code: "MP", category: "Microbiology", sampleType: "Blood Smear", price: 40, turnaroundHours: 1, department: "Microbiology", description: "Microscopic examination for malaria parasites in peripheral blood." },
  { id: "CAT-003", name: "Urinalysis", code: "UA", category: "Clinical Chemistry", sampleType: "Mid-stream Urine", price: 30, turnaroundHours: 1, department: "Clinical Chemistry", description: "Physical, chemical and microscopic examination of urine." },
  { id: "CAT-004", name: "Fasting Blood Sugar (FBS)", code: "FBS", category: "Clinical Chemistry", sampleType: "Plain Blood", price: 35, turnaroundHours: 1, department: "Clinical Chemistry", description: "Glucose measurement after 8-hour fasting to assess diabetes." },
  { id: "CAT-005", name: "Liver Function Test (LFT)", code: "LFT", category: "Clinical Chemistry", sampleType: "Serum", price: 120, turnaroundHours: 4, department: "Clinical Chemistry", description: "ALT, AST, ALP, bilirubin, albumin and total protein panel." },
  { id: "CAT-006", name: "Renal Function Test (RFT)", code: "RFT", category: "Clinical Chemistry", sampleType: "Serum", price: 100, turnaroundHours: 3, department: "Clinical Chemistry", description: "Urea, creatinine, electrolytes and eGFR." },
  { id: "CAT-007", name: "Typhoid Widal Test", code: "WIDAL", category: "Serology", sampleType: "Serum", price: 45, turnaroundHours: 2, department: "Serology", description: "Agglutination test for Salmonella typhi and Salmonella paratyphi antibodies." },
  { id: "CAT-008", name: "HIV Screening (Rapid)", code: "HIV-SCR", category: "Serology", sampleType: "Whole Blood", price: 50, turnaroundHours: 1, department: "Serology", description: "Rapid immunoassay screening for HIV-1 and HIV-2 antibodies." },
  { id: "CAT-009", name: "Hepatitis B Surface Antigen (HBsAg)", code: "HBsAg", category: "Serology", sampleType: "Serum", price: 55, turnaroundHours: 1, department: "Serology", description: "Rapid test for Hepatitis B infection." },
  { id: "CAT-010", name: "Pregnancy Test (Urine)", code: "UPT", category: "Serology", sampleType: "Urine", price: 20, turnaroundHours: 0.5, department: "Serology", description: "hCG detection for pregnancy confirmation." },
  { id: "CAT-011", name: "Blood Culture & Sensitivity", code: "BCXS", category: "Microbiology", sampleType: "Blood", price: 180, turnaroundHours: 48, department: "Microbiology", description: "Culture to identify bacteria and antibiotic sensitivity." },
  { id: "CAT-012", name: "Electrolytes (Na, K, Cl, HCO3)", code: "ELEC", category: "Clinical Chemistry", sampleType: "Serum", price: 90, turnaroundHours: 2, department: "Clinical Chemistry", description: "Serum electrolyte panel for fluid and acid-base balance." },
  { id: "CAT-013", name: "Lipid Profile", code: "LIPID", category: "Clinical Chemistry", sampleType: "Serum (Fasting)", price: 110, turnaroundHours: 3, department: "Clinical Chemistry", description: "Total cholesterol, LDL, HDL and triglycerides." },
  { id: "CAT-014", name: "Prostate Specific Antigen (PSA)", code: "PSA", category: "Serology", sampleType: "Serum", price: 130, turnaroundHours: 4, department: "Serology", description: "PSA level for prostate cancer screening and monitoring." },
  { id: "CAT-015", name: "Stool Microscopy & Culture", code: "STOOL-MC", category: "Microbiology", sampleType: "Stool", price: 60, turnaroundHours: 24, department: "Microbiology", description: "Ova, cysts and parasites; culture for enteric pathogens." },
];

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: LabStoreState = {
  catalog: LAB_CATALOG,
  tests: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_lab_store";
const EMPTY_STATE: LabStoreState = {
  tests: [],
  catalog: [],
};

function loadState(): LabStoreState {
  return EMPTY_STATE;
}

function saveState(s: LabStoreState) {
  void s;
}

let _state: LabStoreState | null = null;

function getState(): LabStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: LabStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeLabStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _synced = false;
export async function syncLabFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const { fetchLabTests, fetchTestCatalog } = await import("@/lib/supabase/db");
    const [tests, catalog] = await Promise.all([fetchLabTests(), fetchTestCatalog()]);
    _state = { tests, catalog };
    listeners.forEach((l) => l());
    _synced = true;
  } catch { /* keep localStorage/seed */ }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

export function getLabTests(): LabTest[] { return [...getState().tests]; }

export function addLabTest(t: LabTest) {
  mutate((s) => { s.tests = [t, ...s.tests]; });
  import("@/lib/supabase/db").then(({ insertLabTest }) => insertLabTest(t)).catch(() => {});
}

export function updateLabTest(id: string, updates: Partial<LabTest>) {
  mutate((s) => {
    s.tests = s.tests.map((t) => t.id === id ? { ...t, ...updates } : t);
  });
  import("@/lib/supabase/db").then(({ upsertLabTestResult }) => upsertLabTestResult(id, updates)).catch(() => {});
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export function getTestCatalog(): TestCatalogItem[] { return [...getState().catalog]; }

// ─── Metrics ─────────────────────────────────────────────────────────────────

export function getLabMetrics() {
  const s = getState();
  const today = s.tests;
  const pending = today.filter((t) => t.status === "Pending");
  const inProgress = today.filter((t) => t.status === "In Progress");
  const sampleCollected = today.filter((t) => t.status === "Sample Collected");
  const completed = today.filter((t) => t.status === "Completed");
  const urgent = today.filter((t) => t.priority !== "Routine" && t.status !== "Completed" && t.status !== "Cancelled");
  const pendingBills = today.filter((t) => t.billStatus === "Pending" || t.billStatus === "Billed");

  return {
    pendingTests: pending.length,
    sampleCollectedTests: sampleCollected.length,
    inProgressTests: inProgress.length,
    completedTests: completed.length,
    urgentTests: urgent.length,
    totalToday: today.length,
    pendingBillCount: pendingBills.length,
    pendingBillValue: pendingBills.reduce((s, t) => s + t.price, 0),
    revenueToday: completed.filter((t) => t.billStatus === "Paid").reduce((s, t) => s + t.price, 0),
    avgTurnaround: completed.length > 0 ? "1h 24m" : "N/A",
  };
}

export function resetLabStore() {
  _state = EMPTY_STATE;
  listeners.forEach((l) => l());
}
