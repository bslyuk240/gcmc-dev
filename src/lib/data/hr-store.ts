/**
 * HR Cross-Department Staff Management Store
 *
 * HR manages the people in all 8 departments:
 *   Doctors, Nurses, Pharmacy, Lab, Front Desk, Accounts, IT, Admin
 *
 * Key flows:
 *   - HR creates/updates staff → IT gets account creation requests
 *   - HR prepares payroll data → Accounts processes salary payments
 *   - HR manages leave → department is notified
 *   - Admin approves staffing decisions
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * StaffDepartment — display labels used in HR UI.
 * The corresponding DB enum values (lowercase) are defined in DBDepartmentKey.
 *
 * Mapping: "Front Desk" → "frontdesk", "Doctors" → "doctors", etc.
 */
export type StaffDepartment =
  | "Doctors" | "Nurses" | "Pharmacy" | "Lab"
  | "Front Desk" | "Accounts" | "Store" | "IT"
  | "HR" | "Administration" | "Non-Clinical Staff" | "NHIS";

/** Map HR display labels to DB department_key values */
export const STAFF_DEPT_TO_DB: Record<StaffDepartment, string> = {
  "Doctors":            "doctors",
  "Nurses":             "nurses",
  "Pharmacy":           "pharmacy",
  "Lab":                "lab",
  "Front Desk":         "frontdesk",
  "Accounts":           "accounts",
  "Store":              "store",
  "IT":                 "it",
  "HR":                 "hr",
  "Administration":     "admin",
  "Non-Clinical Staff": "non_clinical",
  "NHIS":               "nhis",
};

/** Map DB department_key values to HR display labels */
export const DB_TO_STAFF_DEPT: Record<string, StaffDepartment> = {
  doctors:      "Doctors",
  nurses:       "Nurses",
  pharmacy:     "Pharmacy",
  lab:          "Lab",
  frontdesk:    "Front Desk",
  accounts:     "Accounts",
  store:        "Store",
  it:           "IT",
  hr:           "HR",
  admin:        "Administration",
  non_clinical: "Non-Clinical Staff",
  nhis:         "NHIS",
};

// ─── RBAC Role Keys ───────────────────────────────────────────────────────────

/**
 * RBAC role keys — must match the role_key enum in the database and
 * the RoleKey type in src/lib/auth/session.ts.
 */
export type RoleKeyValue =
  | "admin" | "hod" | "hr_manager" | "hr_staff"
  | "doctor" | "nurse" | "pharmacist" | "pharmacy_assistant"
  | "lab_scientist" | "accountant" | "front_desk_staff"
  | "store_keeper" | "it_staff" | "non_clinical_staff"
  | "nhis_officer" | "nhis_manager" | "viewer";

/** Human-readable labels for each RBAC role key */
export const ROLE_KEY_LABELS: Record<RoleKeyValue, string> = {
  admin:                "Administrator",
  hod:                  "Head of Department",
  hr_manager:           "HR Manager",
  hr_staff:             "HR Staff",
  doctor:               "Doctor",
  nurse:                "Nurse",
  pharmacist:           "Pharmacist",
  pharmacy_assistant:   "Pharmacy Assistant",
  lab_scientist:        "Lab Scientist",
  accountant:           "Accountant",
  front_desk_staff:     "Front Desk Staff",
  store_keeper:         "Store Keeper",
  it_staff:             "IT Staff",
  non_clinical_staff:   "Non-Clinical Staff",
  nhis_officer:         "NHIS Officer",
  nhis_manager:         "NHIS Manager",
  viewer:               "Viewer (Read-only)",
};

/** Allowed RBAC role keys per department */
export const DEPT_ROLE_KEYS: Record<StaffDepartment, RoleKeyValue[]> = {
  "Doctors":        ["doctor",            "hod", "viewer"],
  "Nurses":         ["nurse",             "hod", "viewer"],
  "Pharmacy":       ["pharmacist", "pharmacy_assistant", "hod", "viewer"],
  "Lab":            ["lab_scientist",     "hod", "viewer"],
  "Front Desk":     ["front_desk_staff",  "hod", "viewer"],
  "Accounts":       ["accountant",        "hod", "viewer"],
  "Store":          ["store_keeper",      "hod", "viewer"],
  "IT":             ["it_staff",          "hod", "viewer"],
  "HR":             ["hr_manager", "hr_staff", "hod", "viewer"],
  "Administration":     ["admin",             "hod", "viewer"],
  "Non-Clinical Staff": ["non_clinical_staff", "hod", "viewer"],
  "NHIS":               ["nhis_manager", "nhis_officer", "hod", "viewer"],
};

/** Units available per department (absent = no units) */
export const DEPT_UNITS: Partial<Record<StaffDepartment, string[]>> = {
  "Nurses":   ["ICU", "Ward A", "Ward B", "Emergency", "Outpatient"],
  "Doctors":  ["Outpatient", "Ward Round", "Theatre"],
  "Lab":      ["Haematology", "Microbiology", "Biochemistry"],
  "Pharmacy": ["Dispensary", "Compounding"],
};

// ─── Department Head ──────────────────────────────────────────────────────────

export type DepartmentHead = {
  id: string;
  department: StaffDepartment;
  /** Set for non-clinical unit HODs; null/undefined for clinical department HODs */
  unitName?: string;
  staffId: string;
  staffName: string;
  roleLabel: string; // job title of the HOD
  assignedOn: string;
  assignedBy: string;
};

export type StaffStatus = "Active" | "On Leave" | "Suspended" | "Terminated" | "Probation";
export type ContractType = "Permanent" | "Contract" | "Locum" | "Intern";
export type LeaveType = "Annual" | "Sick" | "Maternity" | "Paternity" | "Personal" | "Emergency" | "Study";
export type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";
export type OnboardingStatus = "Initiated" | "IT Pending" | "IT Done" | "Orientation" | "Completed";
export type OffboardingStatus = "Initiated" | "IT Revoke Pending" | "IT Revoked" | "Clearance" | "Completed";

export type StaffMember = {
  id: string;
  name: string;
  department: StaffDepartment;
  unit?: string; // e.g. "ICU", "Ward" for Nurses; "Hematology" for Lab
  specialty?: string; // doctor clinical specialty, e.g. "Paediatrics"
  role: string;  // Human job title, e.g. "Senior Doctor", "Charge Nurse"
  roleKey?: RoleKeyValue; // RBAC system role key, e.g. "doctor", "nurse"
  contractType: ContractType;
  email: string;
  phone: string;
  homeAddress?: string;
  joinDate: string;
  contractEndDate?: string;
  status: StaffStatus;
  licenseNumber?: string;
  licenseExpiry?: string;
  salary: number;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  pensionNumber?: string;
  nhfNumber?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactAddress?: string;
  systemAccessCreated: boolean; // tracks IT account creation
  notes?: string;
};

export type LeaveRequest = {
  id: string;
  staffId: string;
  staffName: string;
  department: StaffDepartment;
  role: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  hrNotes?: string;
};

export type LeaveYearPolicy = {
  year: number;
  annualDays: number;
  carryForwardDays: number;
  notes?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingRecord = {
  id: string;
  staffId: string;
  staffName: string;
  department: StaffDepartment;
  role: string;
  startDate: string;
  status: OnboardingStatus;
  itRequestId?: string;
  itAccountCreated: boolean;
  orientationCompleted: boolean;
  credentialsVerified: boolean;
  contractSigned: boolean;
  initiatedBy: string;
  initiatedAt: string;
};

export type OffboardingRecord = {
  id: string;
  staffId: string;
  staffName: string;
  department: StaffDepartment;
  role: string;
  exitDate: string;
  reason: "Resignation" | "Retirement" | "Termination" | "Contract End";
  status: OffboardingStatus;
  itRevokeRequestId?: string;
  itAccessRevoked: boolean;
  equipmentReturned: boolean;
  exitInterviewDone: boolean;
  initiatedBy: string;
  initiatedAt: string;
};

export type PayrollPrep = {
  id: string;
  period: string;
  department: StaffDepartment;
  staffCount: number;
  grossTotal: number;
  deductions: number;
  netTotal: number;
  status: "Draft" | "Ready" | "Submitted to Accounts" | "Approved" | "Paid";
  preparedBy: string;
  preparedAt: string;
  batchId?: string;
};

export type PayslipLineItem = {
  label: string;
  amount: number;
  percentage?: number;
};

export type GeneratedPayslip = {
  id: string;
  period: string;
  monthKey: string;
  department: StaffDepartment;
  staffId: string;
  staffName: string;
  role: string;
  unit?: string;
  bankName?: string;
  bankAccount?: string;
  taxId?: string;
  baseSalary: number;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  paymentStatus: "Processing" | "Paid";
  workflowStatus: "Generated" | "Batched" | "Submitted to Accounts" | "Approved" | "Paid";
  createdAt: string;
  createdBy: string;
  batchId?: string;
  paidAt?: string;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type HRStoreState = {
  staff: StaffMember[];
  leaveRequests: LeaveRequest[];
  leavePolicies: LeaveYearPolicy[];
  onboarding: OnboardingRecord[];
  offboarding: OffboardingRecord[];
  payrollPreps: PayrollPrep[];
  generatedPayslips: GeneratedPayslip[];
  departmentHeads: DepartmentHead[];
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: HRStoreState = {
  staff: [],
  leaveRequests: [],
  leavePolicies: [],
  onboarding: [],
  offboarding: [],
  payrollPreps: [],
  generatedPayslips: [],
  departmentHeads: [],
};

function buildPayrollPrepsFromPayslips(payslips: GeneratedPayslip[]): PayrollPrep[] {
  const grouped = new Map<string, GeneratedPayslip[]>();

  payslips.forEach((payslip) => {
    const key = `${payslip.period}::${payslip.department}`;
    const current = grouped.get(key) ?? [];
    grouped.set(key, [...current, payslip]);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const [period, department] = key.split("::");
      const batchId = items.find((item) => item.batchId)?.batchId;
      const workflowStates = items.map((item) => item.workflowStatus);

      let status: PayrollPrep["status"] = "Draft";
      if (workflowStates.every((item) => item === "Paid")) status = "Paid";
      else if (workflowStates.every((item) => item === "Approved" || item === "Paid")) status = "Approved";
      else if (workflowStates.some((item) => item === "Submitted to Accounts")) status = "Submitted to Accounts";
      else if (workflowStates.some((item) => item === "Batched")) status = "Ready";

      return {
        id: batchId ?? `PP-${period}-${department}`.replace(/\s+/g, "-").toUpperCase(),
        period,
        department: department as StaffDepartment,
        staffCount: items.length,
        grossTotal: items.reduce((sum, item) => sum + item.grossPay, 0),
        deductions: items.reduce((sum, item) => sum + item.totalDeductions, 0),
        netTotal: items.reduce((sum, item) => sum + item.netPay, 0),
        status,
        preparedBy: items[items.length - 1]?.createdBy ?? "HR Manager",
        preparedAt: items[items.length - 1]?.createdAt ?? "Mar 18, 2026",
        batchId,
      };
    })
    .sort((left, right) => right.period.localeCompare(left.period) || left.department.localeCompare(right.department));
}

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_hr_store";
const EMPTY_HR_STATE: HRStoreState = {
  ...SEED,
  staff: [],
  leaveRequests: [],
  leavePolicies: [],
  onboarding: [],
  offboarding: [],
  payrollPreps: [],
  generatedPayslips: [],
  departmentHeads: [],
};

function loadState(): HRStoreState {
  if (typeof window === "undefined") return EMPTY_HR_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HRStoreState;
      const generatedPayslips = parsed.generatedPayslips ?? [];
      return {
        ...EMPTY_HR_STATE,
        // Restore all arrays from localStorage so the page renders
        // immediately on hard reload (Supabase sync will overwrite with
        // fresh data once the async fetch completes).
        staff:            parsed.staff            ?? [],
        leaveRequests:    parsed.leaveRequests    ?? [],
        leavePolicies:    parsed.leavePolicies    ?? [],
        onboarding:       parsed.onboarding       ?? [],
        offboarding:      parsed.offboarding      ?? [],
        departmentHeads:  parsed.departmentHeads  ?? [],
        generatedPayslips,
        payrollPreps: buildPayrollPrepsFromPayslips(generatedPayslips),
      };
    }
  } catch { /* ignore */ }
  return EMPTY_HR_STATE;
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  if (!remote.length) return local;
  const remoteIds = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
}

function saveState(s: HRStoreState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let _state: HRStoreState | null = null;
function getState(): HRStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: HRStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeHRStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _synced = false;
export async function syncHRFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const {
      fetchStaffMembers,
      fetchLeaveRequests,
    } = await import("@/lib/supabase/db");
    const [staffResult, leaveResult] = await Promise.allSettled([
      fetchStaffMembers(),
      fetchLeaveRequests(),
    ]);
    const staff = staffResult.status === "fulfilled" ? staffResult.value : [];
    const leaveRequests = leaveResult.status === "fulfilled" ? leaveResult.value : [];
    const current = getState();
    _state = {
      ...current,
      staff: mergeById(staff, current.staff),
      leaveRequests: mergeById(leaveRequests, current.leaveRequests),
      payrollPreps: buildPayrollPrepsFromPayslips(current.generatedPayslips),
    };
    saveState(_state);
    listeners.forEach((l) => l());
    _synced = staffResult.status === "fulfilled"
      && leaveResult.status === "fulfilled";
  } catch { /* keep local state */ }
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export function getStaffMembers(): StaffMember[] { return [...getState().staff]; }
export function getStaffByDepartment(dept: StaffDepartment): StaffMember[] {
  return getState().staff.filter((s) => s.department === dept);
}
export function addStaffMember(s: StaffMember) {
  mutate((state) => { state.staff = [s, ...state.staff]; });
  import("@/lib/supabase/db").then(({ insertStaffMember }) => insertStaffMember(s)).catch(() => {});
}
export function replaceStaffMember(nextStaff: StaffMember) {
  mutate((state) => {
    state.staff = state.staff.map((entry) => (entry.id === nextStaff.id ? nextStaff : entry));
  });
}
export async function updateStaffFinancialDetails(
  id: string,
  details: Pick<StaffMember, "bankName" | "bankAccount" | "taxId" | "pensionNumber" | "nhfNumber">,
) {
  const { updateStaffFinancialDetails: persistStaffFinancialDetails } = await import("@/lib/supabase/db");
  await persistStaffFinancialDetails(id, details);
  mutate((state) => {
    state.staff = state.staff.map((staff) =>
      staff.id === id ? { ...staff, ...details } : staff,
    );
  });
}
export function updateStaffStatus(id: string, status: StaffStatus, notes?: string) {
  mutate((state) => {
    state.staff = state.staff.map((s) => s.id === id ? { ...s, status, notes: notes ?? s.notes } : s);
  });
}
export function updateStaffSystemAccess(id: string, created: boolean) {
  mutate((state) => {
    state.staff = state.staff.map((s) => s.id === id ? { ...s, systemAccessCreated: created } : s);
  });
}

/**
 * Update a staff member's RBAC role key and optional display role label.
 * Also updates staff_profiles.role in Supabase when wired.
 */
export function updateStaffRole(id: string, roleKey: RoleKeyValue, roleLabel?: string) {
  mutate((state) => {
    state.staff = state.staff.map((s) =>
      s.id === id
        ? { ...s, roleKey, role: roleLabel ?? s.role }
        : s
    );
  });
}

/** Move a staff member to a different department */
export function updateStaffDept(id: string, department: StaffDepartment, unit?: string) {
  mutate((state) => {
    state.staff = state.staff.map((s) =>
      s.id === id ? { ...s, department, unit: unit ?? undefined } : s
    );
  });
}

/** Update a staff member's unit assignment */
export function updateStaffUnit(id: string, unit: string | undefined) {
  mutate((state) => {
    state.staff = state.staff.map((s) =>
      s.id === id ? { ...s, unit } : s
    );
  });
}

// ─── Department Heads ─────────────────────────────────────────────────────────

export function getDepartmentHeads(): DepartmentHead[] {
  return [...getState().departmentHeads];
}

export function getDepartmentHead(department: StaffDepartment): DepartmentHead | null {
  return getState().departmentHeads.find((h) => h.department === department) ?? null;
}

/**
 * Assign a staff member as HOD for a department.
 * - Sets their roleKey to "hod".
 * - Demotes the previous HOD back to their department's primary role.
 * - Creates/updates the department_heads record.
 *
 * When Supabase is connected, this should also:
 *   - INSERT into department_heads (close previous end_date)
 *   - UPDATE staff_profiles.role = 'hod' for the new HOD
 */
export function setDepartmentHead(
  department: StaffDepartment,
  staffId: string,
  assignedBy: string = "HR Manager",
) {
  mutate((state) => {
    const staff = state.staff.find((s) => s.id === staffId);
    if (!staff) return;

    // Demote previous HOD of this department (if different person)
    const prevHod = state.departmentHeads.find((h) => h.department === department);
    if (prevHod && prevHod.staffId !== staffId) {
      // Revert the old HOD's roleKey to the default for their dept
      const defaultRole = DEPT_ROLE_KEYS[department][0]; // first non-hod role
      state.staff = state.staff.map((s) =>
        s.id === prevHod.staffId
          ? { ...s, roleKey: defaultRole }
          : s
      );
    }

    // Promote new HOD
    state.staff = state.staff.map((s) =>
      s.id === staffId ? { ...s, roleKey: "hod" } : s
    );

    // Upsert department_heads record
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const existing = state.departmentHeads.findIndex((h) => h.department === department);
    const record: DepartmentHead = {
      id: existing >= 0 ? state.departmentHeads[existing].id : `HOD-${Date.now().toString().slice(-5)}`,
      department,
      staffId,
      staffName: staff.name,
      roleLabel: staff.role,
      assignedOn: today,
      assignedBy,
    };

    if (existing >= 0) {
      state.departmentHeads[existing] = record;
    } else {
      state.departmentHeads = [...state.departmentHeads, record];
    }
  });
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export function getLeaveRequests(): LeaveRequest[] { return [...getState().leaveRequests]; }
export function getLeavePolicies(): LeaveYearPolicy[] { return [...getState().leavePolicies]; }
export function getLeavePolicy(year: number): LeaveYearPolicy | null {
  return getState().leavePolicies.find((policy) => policy.year === year) ?? null;
}
export async function addLeaveRequest(l: LeaveRequest) {
  const { insertLeaveRequest } = await import("@/lib/supabase/db");
  await insertLeaveRequest(l);
  mutate((state) => { state.leaveRequests = [l, ...state.leaveRequests]; });
}
export async function updateLeaveStatus(id: string, status: "Approved" | "Rejected", reviewedBy: string, notes?: string) {
  const now = new Date().toISOString();
  const { reviewLeaveRequestByHOD } = await import("@/lib/supabase/db");
  await reviewLeaveRequestByHOD(id, status, reviewedBy, notes ?? "");
  mutate((state) => {
    state.leaveRequests = state.leaveRequests.map((l) =>
      l.id === id ? { ...l, status, reviewedBy, reviewedAt: now, hrNotes: notes ?? l.hrNotes } : l
    );
    // Update staff status for approved/rejected leave
    const req = state.leaveRequests.find((l) => l.id === id);
    if (req) {
      state.staff = state.staff.map((s) =>
        s.id === req.staffId ? { ...s, status: status === "Approved" ? "On Leave" : s.status } : s
      );
    }
  });
}

export async function setLeavePolicy(policy: LeaveYearPolicy) {
  const { upsertLeaveYearPolicy } = await import("@/lib/supabase/db");
  await upsertLeaveYearPolicy(policy);
  mutate((state) => {
    state.leavePolicies = [
      policy,
      ...state.leavePolicies.filter((item) => item.year !== policy.year),
    ].sort((left, right) => right.year - left.year);
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

export function getOnboarding(): OnboardingRecord[] { return [...getState().onboarding]; }
export function addOnboarding(o: OnboardingRecord) {
  mutate((state) => { state.onboarding = [o, ...state.onboarding]; });
}
export function updateOnboardingStep(id: string, updates: Partial<OnboardingRecord>) {
  mutate((state) => {
    state.onboarding = state.onboarding.map((o) => o.id === id ? { ...o, ...updates } : o);
  });
}

// ─── Offboarding ──────────────────────────────────────────────────────────────

export function getOffboarding(): OffboardingRecord[] { return [...getState().offboarding]; }
export function addOffboarding(o: OffboardingRecord) {
  mutate((state) => { state.offboarding = [o, ...state.offboarding]; });
}
export function updateOffboardingStep(id: string, updates: Partial<OffboardingRecord>) {
  mutate((state) => {
    state.offboarding = state.offboarding.map((o) => o.id === id ? { ...o, ...updates } : o);
  });
}

// ─── Payroll Prep ─────────────────────────────────────────────────────────────

export function getPayrollPreps(): PayrollPrep[] { return [...getState().payrollPreps]; }
export function updatePayrollPrepStatus(id: string, status: PayrollPrep["status"]) {
  mutate((state) => {
    state.payrollPreps = state.payrollPreps.map((p) => p.id === id ? { ...p, status } : p);
  });
}

export function getGeneratedPayslips(): GeneratedPayslip[] {
  return [...getState().generatedPayslips];
}

export async function addGeneratedPayslip(payslip: GeneratedPayslip) {
  const { upsertGeneratedPayslip } = await import("@/lib/supabase/db");
  await upsertGeneratedPayslip(payslip);
  mutate((state) => {
    state.generatedPayslips = [
      payslip,
      ...state.generatedPayslips.filter(
        (item) => !(item.staffId === payslip.staffId && item.monthKey === payslip.monthKey),
      ),
    ];
    state.payrollPreps = buildPayrollPrepsFromPayslips(state.generatedPayslips);
  });
}

export async function assignPayslipsToBatch(batchId: string, payslipIds: string[]) {
  const { upsertGeneratedPayslip } = await import("@/lib/supabase/db");
  const current = getState();
  const updated: GeneratedPayslip[] = current.generatedPayslips.map((item) =>
    payslipIds.includes(item.id)
      ? { ...item, batchId, workflowStatus: "Batched", paymentStatus: "Processing" }
      : item,
  );
  await Promise.all(
    updated
      .filter((item) => payslipIds.includes(item.id))
      .map((item) => upsertGeneratedPayslip(item)),
  );
  mutate((state) => {
    state.generatedPayslips = updated;
    state.payrollPreps = buildPayrollPrepsFromPayslips(state.generatedPayslips);
  });
}

export async function updatePayslipWorkflowByBatch(
  batchId: string,
  workflowStatus: GeneratedPayslip["workflowStatus"],
  options?: { paymentStatus?: GeneratedPayslip["paymentStatus"]; paidAt?: string },
) {
  const { upsertGeneratedPayslip } = await import("@/lib/supabase/db");
  const current = getState();
  const updated: GeneratedPayslip[] = current.generatedPayslips.map((item) =>
    item.batchId === batchId
      ? {
          ...item,
          workflowStatus,
          paymentStatus: options?.paymentStatus ?? item.paymentStatus,
          paidAt: options?.paidAt ?? item.paidAt,
        }
      : item,
  );
  await Promise.all(
    updated
      .filter((item) => item.batchId === batchId)
      .map((item) => upsertGeneratedPayslip(item)),
  );
  mutate((state) => {
    state.generatedPayslips = updated;
    state.payrollPreps = buildPayrollPrepsFromPayslips(state.generatedPayslips);
  });
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export function getHRMetrics() {
  const s = getState();
  const active = s.staff.filter((m) => m.status === "Active");
  const onLeave = s.staff.filter((m) => m.status === "On Leave");
  const pending = s.leaveRequests.filter((l) => l.status === "Pending");
  const newHires = s.onboarding.filter((o) => o.status !== "Completed");
  const itPending = s.onboarding.filter((o) => o.status === "IT Pending");
  const expiringLicenses = s.staff.filter((m) => {
    if (!m.licenseExpiry) return false;
    const parts = m.licenseExpiry.split(" ");
    if (parts.length < 2) return false;
    return true; // simplified check
  });
  const contractsExpiring = s.staff.filter((s) => s.contractEndDate).length;
  const payrollReady = s.payrollPreps.filter((p) => p.status === "Ready");
  const totalNetPayroll = payrollReady.reduce((sum, p) => sum + p.netTotal, 0);

  return {
    totalStaff: s.staff.length,
    activeStaff: active.length,
    onLeave: onLeave.length,
    suspended: s.staff.filter((m) => m.status === "Suspended").length,
    pendingLeave: pending.length,
    newHiresInProgress: newHires.length,
    itAccountsPending: itPending.length,
    contractsExpiring,
    payrollBatchesReady: payrollReady.length,
    payrollValueReady: totalNetPayroll,
  };
}
