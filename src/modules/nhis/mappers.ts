import type {
  HmoClaim,
  HmoClaimLine,
  HmoClaimService,
  HmoEnrollment,
  HmoPreAuthorization,
  HmoPreAuthStatus,
  HmoRemittance,
  HmoScheme,
  HmoServiceCategory,
  HmoTariff,
} from "@/modules/nhis/types";

export function mapHmoScheme(row: Record<string, unknown>): HmoScheme {
  return {
    id: String(row.id ?? ""),
    hospitalId: String(row.hospital_id ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    type: (row.type as HmoScheme["type"]) ?? "fee_for_service",
    contactPerson: row.contact_person ? String(row.contact_person) : undefined,
    contactPhone: row.contact_phone ? String(row.contact_phone) : undefined,
    contactEmail: row.contact_email ? String(row.contact_email) : undefined,
    address: row.address ? String(row.address) : undefined,
    isActive: Boolean(row.is_active ?? true),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapHmoTariff(row: Record<string, unknown>): HmoTariff {
  return {
    id: String(row.id ?? ""),
    schemeId: String(row.scheme_id ?? ""),
    serviceCategory: row.service_category as HmoTariff["serviceCategory"],
    serviceName: String(row.service_name ?? ""),
    hmoPrice: Number(row.hmo_price ?? 0),
    copayType: (row.copay_type as HmoTariff["copayType"]) ?? "percentage",
    copayValue: Number(row.copay_value ?? 10),
    isActive: Boolean(row.is_active ?? true),
    notes: row.notes ? String(row.notes) : undefined,
  };
}

export function mapHmoEnrollment(
  row: Record<string, unknown>,
  extras?: { patientName?: string; patientDisplayId?: string; schemeName?: string },
): HmoEnrollment {
  return {
    id: String(row.id ?? ""),
    patientId: String(row.patient_id ?? ""),
    patientDisplayId: extras?.patientDisplayId,
    patientName: extras?.patientName ?? String(row.patient_name ?? ""),
    schemeId: String(row.scheme_id ?? ""),
    schemeName: extras?.schemeName ?? String(row.scheme_name ?? ""),
    memberId: String(row.member_id ?? ""),
    planName: row.plan_name ? String(row.plan_name) : undefined,
    copayPercentage: Number(row.copay_percentage ?? 10),
    isActive: Boolean(row.is_active ?? true),
    verificationStatus: (row.verification_status as HmoEnrollment["verificationStatus"]) ?? "pending",
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    verifiedByName: row.verified_by_name ? String(row.verified_by_name) : undefined,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    validFrom: row.valid_from ? String(row.valid_from) : undefined,
    validUntil: row.valid_until ? String(row.valid_until) : undefined,
    authorizedBy: row.authorized_by ? String(row.authorized_by) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapHmoClaimLine(row: Record<string, unknown>): HmoClaimLine {
  return {
    id: String(row.id ?? ""),
    chargeLineId: String(row.charge_line_id ?? ""),
    serviceType: String(row.service_type ?? "other"),
    description: String(row.description ?? ""),
    amount: Number(row.amount ?? 0),
    hmoAmount: Number(row.hmo_amount ?? 0),
    copayAmount: Number(row.copay_amount ?? 0),
  };
}

export function mapHmoClaim(
  row: Record<string, unknown>,
  extras?: { schemeName?: string; patientName?: string; lines?: HmoClaimLine[] },
): HmoClaim {
  const services = (row.services as HmoClaimService[] | null) ?? [];
  return {
    id: String(row.id ?? ""),
    claimNumber: String(row.claim_number ?? ""),
    schemeId: String(row.scheme_id ?? ""),
    schemeName: extras?.schemeName ?? String(row.scheme_name ?? ""),
    patientId: String(row.patient_id ?? ""),
    patientName: extras?.patientName ?? String(row.patient_name ?? ""),
    enrollmentId: row.enrollment_id ? String(row.enrollment_id) : undefined,
    lines: extras?.lines ?? [],
    services,
    totalCost: Number(row.total_cost ?? 0),
    copayAmount: Number(row.copay_amount ?? 0),
    hmoAmount: Number(row.hmo_amount ?? 0),
    status: (row.status as HmoClaim["status"]) ?? "draft",
    submittedAt: row.submitted_at ? String(row.submitted_at) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : undefined,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    amountPaid: row.amount_paid != null ? Number(row.amount_paid) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at ?? ""),
  };
}

export function mapHmoRemittance(row: Record<string, unknown>): HmoRemittance {
  return {
    id: String(row.id ?? ""),
    schemeId: String(row.scheme_id ?? ""),
    schemeName: row.scheme_name ? String(row.scheme_name) : undefined,
    remittanceRef: String(row.remittance_ref ?? ""),
    amount: Number(row.amount ?? 0),
    receivedAt: String(row.received_at ?? ""),
    bankReference: row.bank_reference ? String(row.bank_reference) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    recordedByName: String(row.recorded_by_name ?? ""),
    createdAt: String(row.created_at ?? ""),
    allocations: [],
  };
}

export function mapHmoPreAuth(row: Record<string, unknown>): HmoPreAuthorization {
  return {
    id: String(row.id ?? ""),
    patientId: String(row.patient_id ?? ""),
    patientRef: row.patient_ref ? String(row.patient_ref) : undefined,
    patientName: String(row.patient_name ?? ""),
    enrollmentId: row.enrollment_id ? String(row.enrollment_id) : undefined,
    schemeId: String(row.scheme_id ?? ""),
    schemeName: row.scheme_name ? String(row.scheme_name) : undefined,
    serviceCategory: row.service_category as HmoServiceCategory,
    serviceName: String(row.service_name ?? ""),
    amountCap: row.amount_cap != null ? Number(row.amount_cap) : undefined,
    authCode: row.auth_code ? String(row.auth_code) : undefined,
    status: (row.status as HmoPreAuthStatus) ?? "pending",
    requestedByName: String(row.requested_by_name ?? ""),
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : undefined,
    validUntil: row.valid_until ? String(row.valid_until) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    referenceType: row.reference_type ? String(row.reference_type) : undefined,
    referenceId: row.reference_id ? String(row.reference_id) : undefined,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}
