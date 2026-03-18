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
  | "HR" | "Administration";

/** Map HR display labels to DB department_key values */
export const STAFF_DEPT_TO_DB: Record<StaffDepartment, string> = {
  "Doctors":       "doctors",
  "Nurses":        "nurses",
  "Pharmacy":      "pharmacy",
  "Lab":           "lab",
  "Front Desk":    "frontdesk",
  "Accounts":      "accounts",
  "Store":         "store",
  "IT":            "it",
  "HR":            "hr",
  "Administration":"admin",
};

/** Map DB department_key values to HR display labels */
export const DB_TO_STAFF_DEPT: Record<string, StaffDepartment> = {
  doctors:    "Doctors",
  nurses:     "Nurses",
  pharmacy:   "Pharmacy",
  lab:        "Lab",
  frontdesk:  "Front Desk",
  accounts:   "Accounts",
  store:      "Store",
  it:         "IT",
  hr:         "HR",
  admin:      "Administration",
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
  | "store_keeper" | "it_staff" | "viewer";

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
  "Administration": ["admin",             "hod", "viewer"],
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
  role: string;  // Human job title, e.g. "Senior Doctor", "Charge Nurse"
  roleKey?: RoleKeyValue; // RBAC system role key, e.g. "doctor", "nurse"
  contractType: ContractType;
  email: string;
  phone: string;
  joinDate: string;
  contractEndDate?: string;
  status: StaffStatus;
  licenseNumber?: string;
  licenseExpiry?: string;
  salary: number;
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
  onboarding: OnboardingRecord[];
  offboarding: OffboardingRecord[];
  payrollPreps: PayrollPrep[];
  generatedPayslips: GeneratedPayslip[];
  departmentHeads: DepartmentHead[];
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: HRStoreState = {
  staff: [],

  leaveRequests: [
    { id: "LV-001", staffId: "EMP-001", staffName: "Dr. Amaka Osei", department: "Doctors", role: "Senior Medical Officer", leaveType: "Annual", startDate: "Dec 20, 2026", endDate: "Dec 31, 2026", days: 8, reason: "Year-end family holiday.", status: "Pending", submittedAt: "Mar 10, 2026" },
    { id: "LV-002", staffId: "EMP-004", staffName: "Nurse Patricia Ama", department: "Nurses", role: "Charge Nurse", leaveType: "Sick", startDate: "Mar 16, 2026", endDate: "Mar 17, 2026", days: 2, reason: "Doctor advised rest — respiratory infection.", status: "Approved", submittedAt: "Mar 15, 2026", reviewedBy: "HR Manager", reviewedAt: "Mar 15, 2026" },
    { id: "LV-003", staffId: "EMP-007", staffName: "James Adu", department: "Pharmacy", role: "Pharmacist", leaveType: "Annual", startDate: "Apr 1, 2026", endDate: "Apr 5, 2026", days: 4, reason: "Personal travel.", status: "Pending", submittedAt: "Mar 12, 2026" },
    { id: "LV-004", staffId: "EMP-011", staffName: "Tom Kwesi", department: "Front Desk", role: "Senior Receptionist", leaveType: "Personal", startDate: "Mar 20, 2026", endDate: "Mar 20, 2026", days: 1, reason: "Family event.", status: "Approved", submittedAt: "Mar 14, 2026", reviewedBy: "HR Manager", reviewedAt: "Mar 14, 2026" },
    { id: "LV-005", staffId: "EMP-013", staffName: "Sarah Mensah", department: "Accounts", role: "Senior Accountant", leaveType: "Maternity", startDate: "Feb 1, 2026", endDate: "Apr 30, 2026", days: 60, reason: "Maternity leave.", status: "Approved", submittedAt: "Jan 20, 2026", reviewedBy: "HR Manager", reviewedAt: "Jan 21, 2026" },
    { id: "LV-006", staffId: "EMP-009", staffName: "Grace Asante", department: "Lab", role: "Senior Lab Technician", leaveType: "Study", startDate: "Apr 10, 2026", endDate: "Apr 14, 2026", days: 5, reason: "Attending lab certification workshop.", status: "Pending", submittedAt: "Mar 14, 2026" },
    { id: "LV-007", staffId: "EMP-003", staffName: "Dr. Chen Lin", department: "Doctors", role: "General Practitioner", leaveType: "Emergency", startDate: "Mar 18, 2026", endDate: "Mar 19, 2026", days: 2, reason: "Family emergency.", status: "Pending", submittedAt: "Mar 15, 2026" },
  ],

  onboarding: [
    { id: "ONB-001", staffId: "EMP-017", staffName: "Dr. Mensah Okeke (New)", department: "Lab", role: "Lab Technician", startDate: "Mar 15, 2026", status: "IT Pending", itRequestId: "IT-1023", itAccountCreated: false, orientationCompleted: false, credentialsVerified: true, contractSigned: true, initiatedBy: "HR Manager", initiatedAt: "Mar 14, 2026" },
    { id: "ONB-002", staffId: "EMP-012", staffName: "Mary Osei", department: "Front Desk", role: "Receptionist", startDate: "Jan 10, 2026", status: "Completed", itAccountCreated: true, orientationCompleted: true, credentialsVerified: true, contractSigned: true, initiatedBy: "HR Manager", initiatedAt: "Jan 8, 2026" },
    { id: "ONB-003", staffId: "EMP-008", staffName: "Abena Darko", department: "Pharmacy", role: "Pharmacy Technician", startDate: "Jan 15, 2026", status: "Completed", itAccountCreated: true, orientationCompleted: true, credentialsVerified: true, contractSigned: true, initiatedBy: "HR Manager", initiatedAt: "Jan 12, 2026" },
  ],

  offboarding: [
    { id: "OFF-001", staffId: "EMP-PREV-091", staffName: "Dr. Raj Patel", department: "Doctors", role: "Consultant", exitDate: "Feb 28, 2026", reason: "Resignation", status: "Completed", itAccessRevoked: true, equipmentReturned: true, exitInterviewDone: true, initiatedBy: "HR Manager", initiatedAt: "Feb 10, 2026" },
  ],

  payrollPreps: [
    { id: "PP-MAR-2026", period: "March 2026", department: "Doctors", staffCount: 18, grossTotal: 158000, deductions: 23700, netTotal: 134300, status: "Ready", preparedBy: "HR Manager", preparedAt: "Mar 14, 2026" },
    { id: "PP-MAR-2026-N", period: "March 2026", department: "Nurses", staffCount: 34, grossTotal: 136000, deductions: 20400, netTotal: 115600, status: "Ready", preparedBy: "HR Manager", preparedAt: "Mar 14, 2026" },
    { id: "PP-MAR-2026-P", period: "March 2026", department: "Pharmacy", staffCount: 12, grossTotal: 55000, deductions: 8250, netTotal: 46750, status: "Draft", preparedBy: "HR Officer", preparedAt: "Mar 15, 2026" },
    { id: "PP-MAR-2026-L", period: "March 2026", department: "Lab", staffCount: 8, grossTotal: 52000, deductions: 7800, netTotal: 44200, status: "Draft", preparedBy: "HR Officer", preparedAt: "Mar 15, 2026" },
    { id: "PP-MAR-2026-FD", period: "March 2026", department: "Front Desk", staffCount: 8, grossTotal: 22000, deductions: 3300, netTotal: 18700, status: "Submitted to Accounts", preparedBy: "HR Manager", preparedAt: "Mar 13, 2026" },
    { id: "PP-MAR-2026-AC", period: "March 2026", department: "Accounts", staffCount: 9, grossTotal: 46000, deductions: 6900, netTotal: 39100, status: "Submitted to Accounts", preparedBy: "HR Manager", preparedAt: "Mar 13, 2026" },
  ],
  generatedPayslips: [],

  departmentHeads: [
    { id: "HOD-001", department: "Doctors",    staffId: "EMP-001", staffName: "Dr. Amaka Osei",    roleLabel: "Senior Medical Officer", assignedOn: "Jan 2022",  assignedBy: "HR Manager" },
    { id: "HOD-002", department: "Nurses",     staffId: "EMP-004", staffName: "Nurse Patricia Ama",roleLabel: "Charge Nurse",            assignedOn: "Mar 2021",  assignedBy: "HR Manager" },
    { id: "HOD-003", department: "Pharmacy",   staffId: "EMP-007", staffName: "James Adu",          roleLabel: "Pharmacist",              assignedOn: "Jun 2023",  assignedBy: "HR Manager" },
    { id: "HOD-004", department: "Lab",        staffId: "EMP-010", staffName: "Dr. Kofi Agyeman",   roleLabel: "Lab Scientist",           assignedOn: "Mar 2020",  assignedBy: "HR Manager" },
    { id: "HOD-005", department: "Front Desk", staffId: "EMP-011", staffName: "Tom Kwesi",          roleLabel: "Senior Receptionist",     assignedOn: "Sep 2022",  assignedBy: "HR Manager" },
    { id: "HOD-006", department: "Accounts",   staffId: "EMP-013", staffName: "Sarah Mensah",       roleLabel: "Senior Accountant",       assignedOn: "Apr 2020",  assignedBy: "HR Manager" },
    { id: "HOD-007", department: "IT",         staffId: "EMP-015", staffName: "John Darko",         roleLabel: "IT Support Lead",         assignedOn: "Jan 2023",  assignedBy: "HR Manager" },
  ],
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
        generatedPayslips,
        payrollPreps: buildPayrollPrepsFromPayslips(generatedPayslips),
      };
    }
  } catch { /* ignore */ }
  return EMPTY_HR_STATE;
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
    const { fetchStaffMembers, fetchLeaveRequests } = await import("@/lib/supabase/db");
    const [staff, leaveRequests] = await Promise.all([fetchStaffMembers(), fetchLeaveRequests()]);
    const current = getState();
    _state = {
      ...current,
      staff,
      leaveRequests,
      payrollPreps: buildPayrollPrepsFromPayslips(current.generatedPayslips),
    };
    saveState(_state);
    listeners.forEach((l) => l());
    _synced = true;
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
export function addLeaveRequest(l: LeaveRequest) {
  mutate((state) => { state.leaveRequests = [l, ...state.leaveRequests]; });
}
export function updateLeaveStatus(id: string, status: LeaveStatus, reviewedBy: string, notes?: string) {
  const now = "Mar 15, 2026";
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

export function addGeneratedPayslip(payslip: GeneratedPayslip) {
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

export function assignPayslipsToBatch(batchId: string, payslipIds: string[]) {
  mutate((state) => {
    state.generatedPayslips = state.generatedPayslips.map((item) =>
      payslipIds.includes(item.id)
        ? { ...item, batchId, workflowStatus: "Batched", paymentStatus: "Processing" }
        : item,
    );
    state.payrollPreps = buildPayrollPrepsFromPayslips(state.generatedPayslips);
  });
}

export function updatePayslipWorkflowByBatch(
  batchId: string,
  workflowStatus: GeneratedPayslip["workflowStatus"],
  options?: { paymentStatus?: GeneratedPayslip["paymentStatus"]; paidAt?: string },
) {
  mutate((state) => {
    state.generatedPayslips = state.generatedPayslips.map((item) =>
      item.batchId === batchId
        ? {
            ...item,
            workflowStatus,
            paymentStatus: options?.paymentStatus ?? item.paymentStatus,
            paidAt: options?.paidAt ?? item.paidAt,
          }
        : item,
    );
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
