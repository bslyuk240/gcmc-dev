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

export type PayrollEntry = {
  staffName: string;
  department: string;
  role: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
};

export type PayrollBatch = {
  id: string;
  period: string;
  totalStaff: number;
  totalAmount: number;
  preparedBy: string;
  preparedAt: string;
  status: PayrollStatus;
  approvedAt?: string;
  paidAt?: string;
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
  labCharges: [
    {
      id: "LAB-BILL-001",
      patientName: "Alice Thompson",
      patientId: "PT-8234",
      testName: "Full Blood Count (FBC)",
      testId: "LAB-001",
      amount: 80,
      orderedBy: "Dr. Robert Smith",
      completedAt: "10:20 AM · Mar 15, 2026",
      status: "Paid",
    },
    {
      id: "LAB-BILL-002",
      patientName: "Ruth Cole",
      patientId: "PT-8241",
      testName: "Liver Function Test (LFT)",
      testId: "LAB-006",
      amount: 120,
      orderedBy: "Dr. Mensah",
      completedAt: "10:45 AM · Mar 15, 2026",
      status: "Paid",
    },
    {
      id: "LAB-BILL-003",
      patientName: "Kofi Mensah",
      patientId: "PT-8236",
      testName: "Malaria Parasite Test",
      testId: "LAB-002",
      amount: 40,
      orderedBy: "Dr. Kwame Mensah",
      completedAt: "—",
      status: "Pending",
    },
    {
      id: "LAB-BILL-004",
      patientName: "Ama Owusu",
      patientId: "PT-8235",
      testName: "Urinalysis",
      testId: "LAB-003",
      amount: 30,
      orderedBy: "Dr. Osei",
      completedAt: "—",
      status: "Pending",
    },
  ],
  nursingCharges: [
    {
      id: "NC-001", patientName: "Ama Owusu", patientId: "PT-8235", unit: "Ward",
      procedureType: "Wound Care", description: "Post-op wound dressing change",
      performedBy: "Nurse Grace", performedAt: "09:00 AM · Mar 15, 2026",
      amount: 40, status: "Billed",
    },
    {
      id: "NC-002", patientName: "Kwame Asante", patientId: "PT-8230", unit: "Ward",
      procedureType: "IV Access", description: "IV cannula insertion",
      performedBy: "Nurse Patricia", performedAt: "08:15 AM · Mar 15, 2026",
      amount: 30, status: "Paid",
    },
    {
      id: "NC-003", patientName: "Kofi Mensah", patientId: "PT-8236", unit: "ICU",
      procedureType: "Catheter", description: "Urinary catheter insertion",
      performedBy: "Nurse Sandra", performedAt: "06:30 AM · Mar 15, 2026",
      amount: 60, status: "Billed",
    },
  ],
  frontDeskCharges: [
    {
      id: "FDC-001",
      patientName: "Alice Thompson",
      patientId: "PT-8234",
      chargeType: "Registration",
      amount: 50,
      description: "New patient card/registration fee",
      createdAt: "09:00 AM · Mar 15, 2026",
      createdBy: "Front Desk (Sarah)",
      visitId: "V-5825",
      status: "Paid",
    },
    {
      id: "FDC-002",
      patientName: "Kofi Mensah",
      patientId: "PT-8236",
      chargeType: "Consultation",
      amount: 80,
      description: "Outpatient consultation fee",
      createdAt: "09:30 AM · Mar 15, 2026",
      createdBy: "Front Desk (Sarah)",
      visitId: "V-5824",
      status: "Pending",
    },
    {
      id: "FDC-003",
      patientName: "Ama Owusu",
      patientId: "PT-8235",
      chargeType: "Emergency",
      amount: 150,
      description: "Emergency consultation fee",
      createdAt: "10:15 AM · Mar 15, 2026",
      createdBy: "Front Desk (Tom)",
      visitId: "V-5823",
      status: "Pending",
    },
  ],
  consultationFees: [
    {
      id: "CF-001",
      patientName: "Alice Thompson",
      patientId: "PT-8234",
      doctorName: "Dr. Robert Smith",
      consultationType: "General",
      fee: 100,
      consultedAt: "10:30 AM · Mar 15, 2026",
      status: "Pending",
    },
    {
      id: "CF-002",
      patientName: "Kofi Mensah",
      patientId: "PT-8236",
      doctorName: "Dr. Kwame Mensah",
      consultationType: "Specialist",
      fee: 250,
      consultedAt: "09:15 AM · Mar 15, 2026",
      status: "Pending",
    },
  ],
  supplierPayments: [
    {
      id: "SP-001",
      poId: "PO-1140",
      supplier: "ClinTech Ghana",
      amount: 3500,
      description: "Medical devices — 3 items",
      items: 3,
      submittedBy: "Store Manager",
      submittedAt: "Mar 10, 2026",
      dueDate: "Mar 20, 2026",
      status: "Pending",
    },
    {
      id: "SP-002",
      poId: "PO-1139",
      supplier: "MedEquip Co.",
      amount: 680,
      description: "Lab equipment — 1 item",
      items: 1,
      submittedBy: "Store Manager",
      submittedAt: "Mar 9, 2026",
      dueDate: "Mar 16, 2026",
      status: "Paid",
      paidAt: "Mar 15, 2026",
    },
  ],
  payrollBatches: [
    {
      id: "PAY-2026-02",
      period: "February 2026",
      totalStaff: 148,
      totalAmount: 312400,
      preparedBy: "HR Manager",
      preparedAt: "Feb 25, 2026",
      status: "Paid",
      approvedAt: "Feb 27, 2026",
      paidAt: "Feb 28, 2026",
      entries: [
        { staffName: "Dr. Amaka Osei", department: "Doctors", role: "Senior Doctor", baseSalary: 8000, allowances: 1200, deductions: 400, netPay: 8800 },
        { staffName: "Nurse Patricia", department: "Nurses", role: "Senior Nurse", baseSalary: 4500, allowances: 800, deductions: 300, netPay: 5000 },
        { staffName: "James Adu", department: "Pharmacy", role: "Pharmacist", baseSalary: 5000, allowances: 600, deductions: 250, netPay: 5350 },
      ],
    },
    {
      id: "PAY-2026-03",
      period: "March 2026",
      totalStaff: 151,
      totalAmount: 318750,
      preparedBy: "HR Manager",
      preparedAt: "Mar 14, 2026",
      status: "Submitted",
      entries: [
        { staffName: "Dr. Amaka Osei", department: "Doctors", role: "Senior Doctor", baseSalary: 8000, allowances: 1200, deductions: 400, netPay: 8800 },
        { staffName: "Nurse Patricia", department: "Nurses", role: "Senior Nurse", baseSalary: 4500, allowances: 800, deductions: 300, netPay: 5000 },
        { staffName: "James Adu", department: "Pharmacy", role: "Pharmacist", baseSalary: 5000, allowances: 600, deductions: 250, netPay: 5350 },
        { staffName: "Tom Kwesi", department: "Front Desk", role: "Receptionist", baseSalary: 2800, allowances: 400, deductions: 150, netPay: 3050 },
      ],
    },
  ],
  kioskSales: [
    {
      id: "KSK-001",
      date: "Mar 14, 2026",
      totalRevenue: 1240,
      cashRevenue: 820,
      mobileRevenue: 420,
      itemsSold: 87,
      reportedBy: "Kiosk Attendant (Abena)",
      reportedAt: "06:00 PM · Mar 14, 2026",
      status: "Confirmed",
    },
    {
      id: "KSK-002",
      date: "Mar 13, 2026",
      totalRevenue: 1080,
      cashRevenue: 700,
      mobileRevenue: 380,
      itemsSold: 74,
      reportedBy: "Kiosk Attendant (Abena)",
      reportedAt: "06:00 PM · Mar 13, 2026",
      status: "Confirmed",
    },
    {
      id: "KSK-003",
      date: "Mar 15, 2026",
      totalRevenue: 0,
      cashRevenue: 0,
      mobileRevenue: 0,
      itemsSold: 0,
      reportedBy: "",
      reportedAt: "",
      status: "Pending",
      notes: "Today's report not yet submitted.",
    },
  ],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_accounts_store";

function loadState(): AccountsStoreState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AccountsStoreState;
  } catch { /* ignore */ }
  return SEED;
}

function saveState(state: AccountsStoreState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
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

// ─── Front Desk Charges ───────────────────────────────────────────────────────

export function getFrontDeskCharges(): FrontDeskCharge[] { return [...getState().frontDeskCharges]; }
export function addFrontDeskCharge(c: FrontDeskCharge) {
  mutate((s) => { s.frontDeskCharges = [c, ...s.frontDeskCharges]; });
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

  const fdPending = s.frontDeskCharges.filter((c) => c.status === "Pending");
  const fdPaid = s.frontDeskCharges.filter((c) => c.status === "Paid");
  const cfPending = s.consultationFees.filter((f) => f.status === "Pending");
  const cfPaid = s.consultationFees.filter((f) => f.status === "Paid");
  const spPending = s.supplierPayments.filter((p) => p.status === "Pending");
  const spPaid = s.supplierPayments.filter((p) => p.status === "Paid");
  const payrollPending = s.payrollBatches.filter((b) => b.status === "Submitted");
  const payrollPaid = s.payrollBatches.filter((b) => b.status === "Paid");
  const kioskToday = s.kioskSales.filter((k) => k.date === "Mar 15, 2026" && k.status === "Confirmed");
  const labCharges = s.labCharges ?? [];
  const labPending = labCharges.filter((c) => c.status === "Pending");
  const labPaid = labCharges.filter((c) => c.status === "Paid");

  const nursingCharges = s.nursingCharges ?? [];
  const nursingPending = nursingCharges.filter((c) => c.status === "Pending" || c.status === "Billed");
  const nursingPaid = nursingCharges.filter((c) => c.status === "Paid");

  const revenueToday =
    fdPaid.filter((c) => c.createdAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0) +
    cfPaid.filter((f) => f.consultedAt.includes("Mar 15")).reduce((s, f) => s + f.fee, 0) +
    kioskToday.reduce((s, k) => s + k.totalRevenue, 0) +
    labPaid.filter((c) => c.completedAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0) +
    nursingPaid.filter((c) => c.performedAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0);

  return {
    frontDeskPendingCount: fdPending.length,
    frontDeskPendingValue: fdPending.reduce((sum, c) => sum + c.amount, 0),
    frontDeskPaidToday: fdPaid.filter((c) => c.createdAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0),

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
    labPaidToday: labPaid.filter((c) => c.completedAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0),

    nursingPendingCount: nursingPending.length,
    nursingPendingValue: nursingPending.reduce((sum, c) => sum + c.amount, 0),
    nursingPaidToday: nursingPaid.filter((c) => c.performedAt.includes("Mar 15")).reduce((s, c) => s + c.amount, 0),

    revenueToday,
  };
}

export function resetAccountsStore() {
  _state = SEED;
  saveState(SEED);
  listeners.forEach((l) => l());
}
