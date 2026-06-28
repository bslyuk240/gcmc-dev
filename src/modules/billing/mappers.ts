import type {
  BillingChargeLine,
  BillingLedgerEntry,
  BillingPayment,
  BillingPaymentAllocation,
  BillingPaymentMethod,
} from "@/modules/billing/types";

export function mapChargeLine(row: Record<string, unknown>): BillingChargeLine {
  const totalAmount = Number(row.total_amount ?? 0);
  const amountPaid = Number(row.amount_paid ?? 0);
  const amountWaived = Number(row.amount_waived ?? 0);
  const isHmo = Boolean(row.is_hmo);
  const copayAmount = row.copay_amount != null ? Number(row.copay_amount) : undefined;
  const collectible = isHmo && copayAmount != null ? copayAmount : totalAmount;
  return {
    id: String(row.id),
    hospitalId: String(row.hospital_id),
    patientId: String(row.patient_id ?? ""),
    patientName: String(row.patient_name ?? "Unknown"),
    visitId: row.visit_id != null ? String(row.visit_id) : undefined,
    stayId: row.stay_id != null ? String(row.stay_id) : undefined,
    sourceTable: String(row.source_table),
    sourceId: String(row.source_id),
    department: String(row.department),
    category: String(row.category ?? "general"),
    description: String(row.description ?? ""),
    quantity: Number(row.quantity ?? 1),
    unitAmount: Number(row.unit_amount ?? 0),
    totalAmount,
    amountPaid,
    amountWaived,
    balanceDue: Math.max(0, Number((collectible - amountPaid - amountWaived).toFixed(2))),
    status: row.status as BillingChargeLine["status"],
    priority: String(row.priority ?? "routine"),
    isHmo,
    copayAmount: row.copay_amount != null ? Number(row.copay_amount) : undefined,
    hmoAmount: row.hmo_amount != null ? Number(row.hmo_amount) : undefined,
    hmoClaimId: row.hmo_claim_id != null ? String(row.hmo_claim_id) : undefined,
    billableAt: String(row.billable_at ?? row.created_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapPayment(row: Record<string, unknown>): BillingPayment {
  return {
    id: String(row.id),
    hospitalId: String(row.hospital_id),
    patientId: row.patient_id != null ? String(row.patient_id) : undefined,
    paymentNumber: String(row.payment_number),
    paymentMethod: row.payment_method as BillingPaymentMethod,
    totalAmount: Number(row.total_amount ?? 0),
    receivedBy: row.received_by != null ? String(row.received_by) : undefined,
    receivedByName: String(row.received_by_name ?? ""),
    receivedAt: String(row.received_at ?? ""),
    reference: row.reference != null ? String(row.reference) : undefined,
    notes: row.notes != null ? String(row.notes) : undefined,
    status: (row.status as BillingPayment["status"]) ?? "posted",
  };
}

export function mapAllocation(row: Record<string, unknown>): BillingPaymentAllocation {
  return {
    id: String(row.id),
    paymentId: String(row.payment_id),
    chargeLineId: String(row.charge_line_id),
    amount: Number(row.amount ?? 0),
    chargeDescription: row.charge_description != null ? String(row.charge_description) : undefined,
    patientName: row.patient_name != null ? String(row.patient_name) : undefined,
  };
}

export function paymentMethodLabel(method: BillingPaymentMethod): string {
  switch (method) {
    case "cash": return "Cash";
    case "card": return "Card";
    case "transfer": return "Bank Transfer";
    case "mobile": return "Mobile Money";
    case "insurance_copay": return "Insurance Copay";
    case "insurance_reimbursement": return "Insurance Reimbursement";
    default: return "Other";
  }
}

export function departmentLabel(dept: string): string {
  switch (dept) {
    case "frontdesk": return "Front Desk";
    case "doctors": return "Consultation";
    case "lab": return "Laboratory";
    case "nurses": return "Nursing";
    case "pharmacy": return "Pharmacy";
    case "inpatient": return "Inpatient";
    default: return dept;
  }
}

export type { BillingLedgerEntry };
