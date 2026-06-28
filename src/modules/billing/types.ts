export type BillingChargeStatus = "open" | "partial" | "paid" | "waived" | "void";

export type BillingPaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "mobile"
  | "insurance_copay"
  | "insurance_reimbursement"
  | "other";

export type BillingChargeLine = {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  stayId?: string;
  sourceTable: string;
  sourceId: string;
  department: string;
  category: string;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountWaived: number;
  balanceDue: number;
  status: BillingChargeStatus;
  priority: string;
  isHmo: boolean;
  copayAmount?: number;
  hmoAmount?: number;
  hmoClaimId?: string;
  billableAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingPayment = {
  id: string;
  hospitalId: string;
  patientId?: string;
  paymentNumber: string;
  paymentMethod: BillingPaymentMethod;
  totalAmount: number;
  receivedBy?: string;
  receivedByName: string;
  receivedAt: string;
  reference?: string;
  notes?: string;
  status: "posted" | "reversed";
};

export type BillingPaymentAllocation = {
  id: string;
  paymentId: string;
  chargeLineId: string;
  amount: number;
  chargeDescription?: string;
  patientName?: string;
};

export type BillingLedgerEntry = BillingPayment & {
  allocations: BillingPaymentAllocation[];
};

export type PatientLedgerSummary = {
  patientId: string;
  patientName: string;
  openBalance: number;
  openCount: number;
  paidToday: number;
  charges: BillingChargeLine[];
  payments: BillingLedgerEntry[];
};

export type CashDeskQueue = {
  lines: BillingChargeLine[];
  totals: {
    openCount: number;
    openBalance: number;
    collectedToday: number;
    collectedCount: number;
  };
};

export type BillingReportSummary = {
  rangeLabel: string;
  revenue: number;
  outflows: number;
  net: number;
  byDepartment: Array<{ department: string; amount: number; count: number }>;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  openBalance: number;
  openCount: number;
};

export type DayClosureSummary = {
  id?: string;
  businessDate: string;
  status: "open" | "closed";
  expectedCash: number;
  countedCash?: number;
  variance?: number;
  collectedToday: number;
  paymentCount: number;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  closedAt?: string;
  closedByName?: string;
};

export type PatientSearchResult = {
  patientId: string;
  patientName: string;
  openBalance: number;
  openCount: number;
  lastBillableAt?: string;
};
