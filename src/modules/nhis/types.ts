export type HmoSchemeType = "capitation" | "fee_for_service";

export type HmoServiceCategory =
  | "consultation"
  | "lab"
  | "pharmacy"
  | "nursing"
  | "procedure"
  | "admission"
  | "other";

export type EnrollmentVerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type HmoClaimStatus = "draft" | "submitted" | "approved" | "rejected" | "paid" | "partial";

export type HmoScheme = {
  id: string;
  hospitalId?: string;
  name: string;
  code: string;
  type: HmoSchemeType;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
};

export type HmoTariff = {
  id: string;
  schemeId: string;
  serviceCategory: HmoServiceCategory;
  serviceName: string;
  hmoPrice: number;
  copayType: "percentage" | "fixed";
  copayValue: number;
  isActive: boolean;
  notes?: string;
};

export type HmoEnrollment = {
  id: string;
  patientId: string;
  patientDisplayId?: string;
  patientName: string;
  schemeId: string;
  schemeName: string;
  memberId: string;
  planName?: string;
  copayPercentage: number;
  isActive: boolean;
  verificationStatus?: EnrollmentVerificationStatus;
  verifiedAt?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  validFrom?: string;
  validUntil?: string;
  authorizedBy?: string;
  notes?: string;
  createdAt: string;
};

export type HmoClaimLine = {
  id: string;
  chargeLineId: string;
  serviceType: string;
  description: string;
  amount: number;
  hmoAmount: number;
  copayAmount: number;
};

export type HmoClaimService = {
  type: string;
  chargeId: string;
  description: string;
  amount: number;
  hmoAmount: number;
  copay: number;
};

export type HmoClaim = {
  id: string;
  claimNumber: string;
  schemeId: string;
  schemeName: string;
  patientId: string;
  patientName: string;
  enrollmentId?: string;
  lines?: HmoClaimLine[];
  services: HmoClaimService[];
  totalCost: number;
  copayAmount: number;
  hmoAmount: number;
  status: HmoClaimStatus;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  amountPaid?: number;
  notes?: string;
  createdAt: string;
};

export type HmoRegistration = {
  id: string;
  patientId: string;
  patientDisplayId: string;
  patientName: string;
  primaryHmoSchemeId?: string;
  registeredAt: string;
  registeredBy: string;
  hasHmo: boolean;
};

export type UnclaimedHmoCharge = {
  id: string;
  patientId: string;
  patientName: string;
  department: string;
  description: string;
  totalAmount: number;
  copayAmount?: number;
  hmoAmount?: number;
  amountPaid: number;
  copayCollected: boolean;
  billableAt: string;
};

export type HmoRemittance = {
  id: string;
  schemeId: string;
  schemeName?: string;
  remittanceRef: string;
  amount: number;
  receivedAt: string;
  bankReference?: string;
  notes?: string;
  recordedByName: string;
  createdAt: string;
  allocations: Array<{ claimId: string; claimNumber?: string; amount: number }>;
};

export type NhisDashboardSummary = {
  activeEnrollments: number;
  pendingVerifications: number;
  pendingRegistrations: number;
  activeClaims: number;
  draftClaims: number;
  hmoReceivables: number;
  statusCounts: Record<HmoClaimStatus, number>;
  recentClaims: HmoClaim[];
  schemeBreakdown: Array<{
    scheme: HmoScheme;
    enrolledCount: number;
    pendingAmount: number;
  }>;
  pendingRegistrationsList?: HmoRegistration[];
  pendingVerificationsList?: HmoEnrollment[];
  pendingPreauthorizations?: number;
};

export type HmoPreAuthStatus = "pending" | "approved" | "denied" | "expired" | "used";

export type HmoPreAuthorization = {
  id: string;
  patientId: string;
  patientRef?: string;
  patientName: string;
  enrollmentId?: string;
  schemeId: string;
  schemeName?: string;
  serviceCategory: HmoServiceCategory;
  serviceName: string;
  amountCap?: number;
  authCode?: string;
  status: HmoPreAuthStatus;
  requestedByName: string;
  reviewedByName?: string;
  validUntil?: string;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
};
