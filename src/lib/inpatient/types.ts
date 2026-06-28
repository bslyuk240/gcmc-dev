export type InpatientStayStatus = "active" | "discharged";

export type InpatientChargeType = "bed_day" | "consumable";

export type ChargeStatus = "Pending" | "Billed" | "Paid" | "Waived";

export type InpatientStay = {
  id: string;
  patientId: string;
  patientName: string;
  unit: string;
  bed: string | null;
  admissionOrderId: string | null;
  wardPatientId: string | null;
  doctorInCharge: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  status: InpatientStayStatus;
};

export type InpatientCharge = {
  id: string;
  stayId: string;
  chargeType: InpatientChargeType;
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  status: ChargeStatus;
  chargeDate: string | null;
  recordedBy: string | null;
  recordedAt: string;
};

export type InpatientSummaryLine = {
  id: string;
  source: "inpatient" | "nursing" | "lab" | "pharmacy" | "consultation";
  category: string;
  description: string;
  amount: number;
  status: string;
  occurredAt: string;
};

export type InpatientStaySummary = {
  stay: InpatientStay;
  lines: InpatientSummaryLine[];
  totals: {
    all: number;
    pending: number;
    paid: number;
  };
};
