/**
 * Accounts Cross-Department Shared Store
 *
 * Tracks financial flows from 7 departments into Accounts:
 *   Front Desk  → Registration / visit charges
 *   Doctors     → Consultation fees
 *   Store       → Supplier payment requests (procurement)
 *   HR          → Payroll disbursement
 *   Kiosk       → Daily sales revenue
 *   Pharmacy    → Medication bills  (see pharmacy-store.ts)
 *   Admin       → Financial oversight (reads from this store)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChargeStatus = "Pending" | "Billed" | "Paid" | "Waived" | "Partial";

export type FrontDeskCharge = {
  id: string;
  patientName: string;
  patientId: string;
  chargeType: "Registration" | "Consultation" | "Emergency" | "Follow-up" | "Procedure" | "Lab" | "Antenatal" | "Other";
  amount: number;
  description: string;
  createdAt: string;
  createdBy: string;
  visitId?: string;
  status: ChargeStatus;
};

export type ConsultationFee = {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  consultationType: "General" | "Specialist" | "Emergency" | "Follow-up" | "Antenatal";
  fee: number;
  consultedAt: string;
  status: ChargeStatus;
};

export type SupplierPaymentStatus = "Pending" | "Approved" | "Paid" | "Rejected";

export type SupplierPayment = {
  id: string;
  poId: string;
  supplier: string;
  amount: number;
  description: string;
  items: number;
  submittedBy: string;
  submittedAt: string;
  dueDate: string;
  status: SupplierPaymentStatus;
  paidAt?: string;
};

export type PayrollStatus = "Draft" | "Submitted" | "Approved" | "Paid";

export type PayrollAllowanceBreakdown = {
  housing: number;
  transport: number;
  medical: number;
  meal: number;
  duty: number;
  overtime: number;
  bonus: number;
  arrears: number;
  other: number;
};

export type PayrollDeductionBreakdown = {
  paye: number;
  pension: number;
  nhf: number;
  loan: number;
  insurance: number;
  absence: number;
  other: number;
};

export type PayrollLineItem = {
  label: string;
  amount: number;
  percentage?: number;
};

export type PayrollEntry = {
  staffId?: string;
  staffName: string;
  department: string;
  role: string;
  employmentType?: string;
  unit?: string;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  paymentMethod?: "Bank Transfer" | "Cash" | "Mobile Money";
  payGrade?: string;
  payStep?: string;
  payrollRef?: string;
  payslipId?: string;
  monthKey?: string;
  baseSalary: number;
  grossPay?: number;
  taxablePay?: number;
  employerPension?: number;
  taxPercent?: number;
  customEarnings?: PayrollLineItem[];
  customDeductions?: PayrollLineItem[];
  allowanceBreakdown?: PayrollAllowanceBreakdown;
  deductionBreakdown?: PayrollDeductionBreakdown;
  allowances: number;
  deductions: number;
  netPay: number;
};

export type PayrollBatch = {
  id: string;
  period: string;
  department?: string;
  totalStaff: number;
  totalAmount: number;
  preparedBy: string;
  preparedAt: string;
  status: PayrollStatus;
  approvedAt?: string;
  paidAt?: string;
  payslipIds?: string[];
  entries: PayrollEntry[];
};

export type KioskSale = {
  id: string;
  date: string;
  totalRevenue: number;
  cashRevenue: number;
  mobileRevenue: number;
  itemsSold: number;
  reportedBy: string;
  reportedAt: string;
  status: "Pending" | "Confirmed";
  notes?: string;
};

export type LabCharge = {
  id: string;
  patientName: string;
  patientId: string;
  testName: string;
  testId: string;
  amount: number;
  orderedBy: string;
  completedAt: string;
  status: ChargeStatus;
};

export type NursingCharge = {
  id: string;
  patientName: string;
  patientId: string;
  unit: string;
  procedureType: string;
  description: string;
  performedBy: string;
  performedAt: string;
  amount: number;
  status: ChargeStatus;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type AccountsStoreState = {
  frontDeskCharges: FrontDeskCharge[];
  consultationFees: ConsultationFee[];
  supplierPayments: SupplierPayment[];
  payrollBatches: PayrollBatch[];
  kioskSales: KioskSale[];
  labCharges: LabCharge[];
  nursingCharges: NursingCharge[];
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: AccountsStoreState = {
  labCharges: [],
  nursingCharges: [],
  frontDeskCharges: [],
  consultationFees: [],
  supplierPayments: [],
  payrollBatches: [],
  kioskSales: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_accounts_store";
const EMPTY_STATE: AccountsStoreState = {
  frontDeskCharges: [],
  consultationFees: [],
  supplierPayments: [],
  payrollBatches: [],
  kioskSales: [],
  labCharges: [],
  nursingCharges: [],
};

function loadState(): AccountsStoreState {
  if (typeof window === "undefined") return { ...EMPTY_STATE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AccountsStoreState) : { ...EMPTY_STATE };
  } catch { return { ...EMPTY_STATE }; }
}

function saveState(state: AccountsStoreState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota */ }
}

let _state: AccountsStoreState | null = null;

function getState(): AccountsStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: AccountsStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeAccountsStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _lastSync = 0;
export async function syncAccountsFromSupabase(force = false) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (!force && now - _lastSync < 30_000) return;
  _lastSync = now;
  try {
    const { fetchFrontDeskCharges, fetchConsultationFees, fetchSupplierPayments, fetchPayrollBatches, fetchKioskSales, fetchLabCharges, fetchNursingCharges } = await import("@/lib/supabase/db");
    const [frontDeskCharges, consultationFees, supplierPayments, payrollBatches, kioskSales, labCharges, nursingCharges] = await Promise.all([
      fetchFrontDeskCharges(), fetchConsultationFees(), fetchSupplierPayments(),
      fetchPayrollBatches(), fetchKioskSales(), fetchLabCharges(), fetchNursingCharges(),
    ]);
    _state = { frontDeskCharges, consultationFees, supplierPayments, payrollBatches, kioskSales, labCharges, nursingCharges };
    saveState(_state);
    listeners.forEach((l) => l());
  } catch (err) { console.error("[accounts-store] sync failed:", err); }
}

// ─── Front Desk Charges ───────────────────────────────────────────────────────

export function getFrontDeskCharges(): FrontDeskCharge[] { return [...getState().frontDeskCharges]; }
export function addFrontDeskCharge(c: FrontDeskCharge) {
  mutate((s) => { s.frontDeskCharges = [c, ...s.frontDeskCharges]; });
  import("@/lib/supabase/db").then(({ insertFrontDeskCharge }) => insertFrontDeskCharge(c)).catch((err) => console.error('[accounts-store] write failed:', err));
}
export function updateFrontDeskChargeStatus(id: string, status: ChargeStatus) {
  mutate((s) => { s.frontDeskCharges = s.frontDeskCharges.map((c) => c.id === id ? { ...c, status } : c); });
}

// ─── Consultation Fees ────────────────────────────────────────────────────────

export function getConsultationFees(): ConsultationFee[] { return [...getState().consultationFees]; }
export function addConsultationFee(f: ConsultationFee) {
  mutate((s) => { s.consultationFees = [f, ...s.consultationFees]; });
}
export function updateConsultationFeeStatus(id: string, status: ChargeStatus) {
  mutate((s) => { s.consultationFees = s.consultationFees.map((f) => f.id === id ? { ...f, status } : f); });
}

// ─── Supplier Payments ────────────────────────────────────────────────────────

export function getSupplierPayments(): SupplierPayment[] { return [...getState().supplierPayments]; }
export function addSupplierPayment(p: SupplierPayment) {
  mutate((s) => { s.supplierPayments = [p, ...s.supplierPayments]; });
}
export function updateSupplierPaymentStatus(id: string, status: SupplierPaymentStatus, extra?: Partial<SupplierPayment>) {
  mutate((s) => { s.supplierPayments = s.supplierPayments.map((p) => p.id === id ? { ...p, status, ...extra } : p); });
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export function getPayrollBatches(): PayrollBatch[] { return [...getState().payrollBatches]; }
export function addPayrollBatch(b: PayrollBatch) {
  mutate((s) => { s.payrollBatches = [b, ...s.payrollBatches]; });
}
export function updatePayrollStatus(id: string, status: PayrollStatus, extra?: Partial<PayrollBatch>) {
  mutate((s) => { s.payrollBatches = s.payrollBatches.map((b) => b.id === id ? { ...b, status, ...extra } : b); });
}

// ─── Kiosk Sales ─────────────────────────────────────────────────────────────

export function getKioskSales(): KioskSale[] { return [...getState().kioskSales]; }
export function addKioskSale(sale: KioskSale) {
  mutate((s) => { s.kioskSales = [sale, ...s.kioskSales]; });
}
export function updateKioskSaleStatus(id: string, status: KioskSale["status"]) {
  mutate((s) => { s.kioskSales = s.kioskSales.map((k) => k.id === id ? { ...k, status } : k); });
}

// ─── Lab Charges ──────────────────────────────────────────────────────────────

export function getLabCharges(): LabCharge[] { return [...(getState().labCharges ?? [])]; }
export function addLabCharge(c: LabCharge) {
  mutate((s) => { s.labCharges = [c, ...(s.labCharges ?? [])]; });
}
export function updateLabChargeStatus(id: string, status: ChargeStatus) {
  mutate((s) => { s.labCharges = (s.labCharges ?? []).map((c) => c.id === id ? { ...c, status } : c); });
}

// ─── Nursing Charges ─────────────────────────────────────────────────────────

export function getNursingCharges(): NursingCharge[] { return [...(getState().nursingCharges ?? [])]; }
export function addNursingCharge(c: NursingCharge) {
  mutate((s) => { s.nursingCharges = [c, ...(s.nursingCharges ?? [])]; });
}
export function updateNursingChargeStatus(id: string, status: ChargeStatus) {
  mutate((s) => { s.nursingCharges = (s.nursingCharges ?? []).map((c) => c.id === id ? { ...c, status } : c); });
}

// ─── Financial Metrics (for Admin and Accounts dashboard) ────────────────────

export function getAccountsMetrics() {
  const s = getState();

  const todayLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }); // e.g. "19 Mar"
  const todayDate  = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); // e.g. "19 Mar 2026"

  const fdPending = s.frontDeskCharges.filter((c) => c.status === "Pending");
  const fdPaid = s.frontDeskCharges.filter((c) => c.status === "Paid");
  const cfPending = s.consultationFees.filter((f) => f.status === "Pending");
  const cfPaid = s.consultationFees.filter((f) => f.status === "Paid");
  const spPending = s.supplierPayments.filter((p) => p.status === "Pending");
  const spPaid = s.supplierPayments.filter((p) => p.status === "Paid");
  const payrollPending = s.payrollBatches.filter((b) => b.status === "Submitted");
  const payrollPaid = s.payrollBatches.filter((b) => b.status === "Paid");
  const kioskToday = s.kioskSales.filter((k) => k.date === todayDate && k.status === "Confirmed");
  const labCharges = s.labCharges ?? [];
  const labPending = labCharges.filter((c) => c.status === "Pending");
  const labPaid = labCharges.filter((c) => c.status === "Paid");

  const nursingCharges = s.nursingCharges ?? [];
  const nursingPending = nursingCharges.filter((c) => c.status === "Pending" || c.status === "Billed");
  const nursingPaid = nursingCharges.filter((c) => c.status === "Paid");

  const revenueToday =
    fdPaid.filter((c) => c.createdAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0) +
    cfPaid.filter((f) => f.consultedAt.includes(todayLabel)).reduce((s, f) => s + f.fee, 0) +
    kioskToday.reduce((s, k) => s + k.totalRevenue, 0) +
    labPaid.filter((c) => c.completedAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0) +
    nursingPaid.filter((c) => c.performedAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0);

  return {
    frontDeskPendingCount: fdPending.length,
    frontDeskPendingValue: fdPending.reduce((sum, c) => sum + c.amount, 0),
    frontDeskPaidToday: fdPaid.filter((c) => c.createdAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0),

    consultationPendingCount: cfPending.length,
    consultationPendingValue: cfPending.reduce((sum, f) => sum + f.fee, 0),

    supplierPendingCount: spPending.length,
    supplierPendingValue: spPending.reduce((sum, p) => sum + p.amount, 0),
    supplierPaidMTD: spPaid.reduce((sum, p) => sum + p.amount, 0),

    payrollPendingCount: payrollPending.length,
    payrollPendingValue: payrollPending.reduce((sum, b) => sum + b.totalAmount, 0),
    payrollPaidMTD: payrollPaid.reduce((sum, b) => sum + b.totalAmount, 0),

    kioskRevenueToday: kioskToday.reduce((s, k) => s + k.totalRevenue, 0),
    kioskRevenueMTD: s.kioskSales.filter((k) => k.status === "Confirmed").reduce((s, k) => s + k.totalRevenue, 0),

    labPendingCount: labPending.length,
    labPendingValue: labPending.reduce((sum, c) => sum + c.amount, 0),
    labPaidToday: labPaid.filter((c) => c.completedAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0),

    nursingPendingCount: nursingPending.length,
    nursingPendingValue: nursingPending.reduce((sum, c) => sum + c.amount, 0),
    nursingPaidToday: nursingPaid.filter((c) => c.performedAt.includes(todayLabel)).reduce((s, c) => s + c.amount, 0),

    revenueToday,
  };
}

export function resetAccountsStore() {
  _state = EMPTY_STATE;
  listeners.forEach((l) => l());
}
