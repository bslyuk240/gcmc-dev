/** Base path for all internal (staff) routes. Public site stays at / */
export const INTERNAL_PREFIX = "/app";

/**
 * All navigation keys — includes both database-backed departments and
 * UI-only sections (support, notifications, profile).
 */
export type DepartmentKey =
  | "dashboard"
  | "frontdesk"
  | "doctors"
  | "nurses"
  | "pharmacy"
  | "lab"
  | "accounts"
  | "store"
  | "admin"
  | "hr"
  | "it"
  | "support"
  | "notifications"
  | "profile";

/**
 * Canonical department keys that correspond to `department_key` in the database.
 * Does NOT include UI-only sections (support, notifications, profile, dashboard).
 *
 * Must stay in sync with the `department_key` Postgres enum in:
 *   supabase/migrations/0002_enums.sql  (base)
 *   supabase/migrations/0018_patch_enums.sql  (+lab)
 */
export type DBDepartmentKey =
  | "frontdesk"
  | "doctors"
  | "nurses"
  | "pharmacy"
  | "lab"
  | "accounts"
  | "store"
  | "admin"
  | "hr"
  | "it";

/** All valid DB department key values as a runtime array for validation */
export const DB_DEPARTMENT_KEYS: DBDepartmentKey[] = [
  "frontdesk", "doctors", "nurses", "pharmacy", "lab",
  "accounts", "store", "admin", "hr", "it",
];

export function isDBDepartmentKey(value: string): value is DBDepartmentKey {
  return DB_DEPARTMENT_KEYS.includes(value as DBDepartmentKey);
}

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  department: DepartmentKey;
};

export type SidebarSection = {
  section: string;
  items: Array<{
    label: string;
    href?: string;
    icon:
      | "dashboard"
      | "patients"
      | "calendar"
      | "billing"
      | "reports"
      | "support"
      | "search"
      | "bell"
      | "settings"
      | "chevron"
      | "plus"
      | "download"
      | "queue"
      | "play"
      | "user-add"
      | "view"
      | "hospital"
      | "status"
      | "group"
      | "money"
      | "pharmacy";
  }>;
};

export type WorkspaceBoard = {
  heading: string;
  subheading: string;
  stats: Array<{ label: string; value: string; change: string }>;
  queue: Array<{ label: string; detail: string; state: string }>;
  highlights: Array<{ title: string; copy: string }>;
  table: {
    columns: string[];
    rows: string[][];
  };
};

/** Public website nav only. Staff login is not linked; access via /login URL. */
export const publicNavigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/appointments", label: "Book Appointment" },
  { href: "/patient-verify", label: "Patient Verify" },
  { href: "/contact", label: "Contact" },
];

export const dashboardNavigation: Array<{
  section: string;
  items: NavigationItem[];
}> = [
  {
    section: "Overview",
    items: [
      {
        href: `${INTERNAL_PREFIX}/dashboard`,
        label: "Global Dashboard",
        description: "Operational snapshot across departments.",
        department: "dashboard",
      },
      {
        href: `${INTERNAL_PREFIX}/notifications`,
        label: "Notifications",
        description: "Alerts, escalations, and reminders.",
        department: "notifications",
      },
    ],
  },
  {
    section: "Departments",
    items: [
      {
        href: `${INTERNAL_PREFIX}/frontdesk`,
        label: "Front Desk",
        description: "Registration, queueing, and visit intake.",
        department: "frontdesk",
      },
      {
        href: `${INTERNAL_PREFIX}/doctors`,
        label: "Doctors",
        description: "Consultations, diagnosis, and prescribing.",
        department: "doctors",
      },
      {
        href: `${INTERNAL_PREFIX}/nurses`,
        label: "Nurses",
        description: "Triage, vitals, and medication administration.",
        department: "nurses",
      },
      {
        href: `${INTERNAL_PREFIX}/pharmacy`,
        label: "Pharmacy",
        description: "Dispensing, substitutions, and stock visibility.",
        department: "pharmacy",
      },
      {
        href: `${INTERNAL_PREFIX}/accounts`,
        label: "Accounts",
        description: "Invoices, payments, receipts, and expenses.",
        department: "accounts",
      },
      {
        href: `${INTERNAL_PREFIX}/store`,
        label: "Store",
        description: "Procurement, stock requests, and item issues.",
        department: "store",
      },
      {
        href: `${INTERNAL_PREFIX}/admin`,
        label: "Admin",
        description: "Approvals, oversight, audit, and reporting.",
        department: "admin",
      },
      {
        href: `${INTERNAL_PREFIX}/hr`,
        label: "HR",
        description: "Staff profiles, roles, and documents.",
        department: "hr",
      },
      {
        href: `${INTERNAL_PREFIX}/lab`,
        label: "Lab",
        description: "Test requests, sample processing, and diagnostic results.",
        department: "lab",
      },
      {
        href: `${INTERNAL_PREFIX}/it`,
        label: "IT",
        description: "User administration, incidents, and support tooling.",
        department: "it",
      },
    ],
  },
  {
    section: "Personal",
    items: [
      {
        href: `${INTERNAL_PREFIX}/profile`,
        label: "Profile",
        description: "Personal profile, activity, and security controls.",
        department: "profile",
      },
    ],
  },
];

export const departmentThemes: Record<
  DepartmentKey,
  { label: string; chipClass: string }
> = {
  dashboard: { label: "Global", chipClass: "bg-blue-50 text-blue-700" },
  frontdesk: { label: "Front Desk", chipClass: "bg-blue-50 text-blue-700" },
  doctors: { label: "Doctors", chipClass: "bg-indigo-50 text-indigo-700" },
  nurses: { label: "Nurses", chipClass: "bg-teal-50 text-teal-700" },
  pharmacy: { label: "Pharmacy", chipClass: "bg-orange-50 text-orange-700" },
  lab: { label: "Lab", chipClass: "bg-sky-50 text-sky-700" },
  accounts: { label: "Accounts", chipClass: "bg-emerald-50 text-emerald-700" },
  store: { label: "Store", chipClass: "bg-green-50 text-green-700" },
  admin: { label: "Admin", chipClass: "bg-slate-100 text-slate-700" },
  hr: { label: "HR", chipClass: "bg-violet-50 text-violet-700" },
  it: { label: "IT", chipClass: "bg-cyan-50 text-cyan-800" },
  support: { label: "Support", chipClass: "bg-blue-50 text-blue-700" },
  notifications: {
    label: "Notifications",
    chipClass: "bg-blue-50 text-blue-700",
  },
  profile: { label: "Profile", chipClass: "bg-blue-50 text-blue-700" },
};

export const sidebarNavigationByDepartment: Record<
  DepartmentKey,
  SidebarSection[]
> = {
  dashboard: [
    {
      section: "Overview",
      items: [{ label: "Dashboard", href: `${INTERNAL_PREFIX}/dashboard`, icon: "dashboard" }],
    },
    {
      section: "Departments",
      items: [
        { label: "Front Desk", href: `${INTERNAL_PREFIX}/frontdesk`, icon: "patients" },
        { label: "Doctors", href: `${INTERNAL_PREFIX}/doctors`, icon: "hospital" },
        { label: "Nurses", href: `${INTERNAL_PREFIX}/nurses`, icon: "group" },
        { label: "Pharmacy", href: `${INTERNAL_PREFIX}/pharmacy`, icon: "billing" },
        { label: "Lab", href: `${INTERNAL_PREFIX}/lab`, icon: "view" },
        { label: "Accounts", href: `${INTERNAL_PREFIX}/accounts`, icon: "money" },
        { label: "Store", href: `${INTERNAL_PREFIX}/store`, icon: "reports" },
        { label: "Admin", href: `${INTERNAL_PREFIX}/admin`, icon: "dashboard" },
        { label: "HR", href: `${INTERNAL_PREFIX}/hr`, icon: "patients" },
        { label: "IT", href: `${INTERNAL_PREFIX}/it`, icon: "settings" },
      ],
    },
  ],
  frontdesk: [
    {
      section: "Front Desk",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/frontdesk`, icon: "dashboard" },
        { label: "Patients", href: `${INTERNAL_PREFIX}/frontdesk/patients`, icon: "patients" },
        { label: "Visits / Check-in", href: `${INTERNAL_PREFIX}/frontdesk/visits`, icon: "calendar" },
        { label: "Front Desk Billing", href: `${INTERNAL_PREFIX}/frontdesk/billing`, icon: "money" },
        { label: "Search", href: `${INTERNAL_PREFIX}/frontdesk/search`, icon: "search" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/frontdesk/chat`, icon: "support" },
      ],
    },
  ],
  doctors: [
    {
      section: "Clinical",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/doctors`, icon: "dashboard" },
        { label: "Waiting Queue", href: `${INTERNAL_PREFIX}/doctors/queue`, icon: "queue" },
        { label: "Consultations", href: `${INTERNAL_PREFIX}/doctors/consultations`, icon: "hospital" },
        { label: "Admitted Patients", href: `${INTERNAL_PREFIX}/doctors/admitted-patients`, icon: "status" },
      ],
    },
    {
      section: "Orders & Results",
      items: [
        { label: "Lab Orders", href: `${INTERNAL_PREFIX}/doctors/lab-orders`, icon: "view" },
        { label: "Lab Results", href: `${INTERNAL_PREFIX}/doctors/lab-results`, icon: "reports" },
        { label: "Prescriptions", href: `${INTERNAL_PREFIX}/doctors/prescriptions`, icon: "billing" },
      ],
    },
    {
      section: "Records",
      items: [
        { label: "Consultation History", href: `${INTERNAL_PREFIX}/doctors/history`, icon: "reports" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/doctors/chat`, icon: "support" },
      ],
    },
  ],
  nurses: [
    {
      section: "Nursing Units",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/nurses`, icon: "dashboard" },
        { label: "Outpatient / Triage", href: `${INTERNAL_PREFIX}/nurses/triage`, icon: "queue" },
        { label: "Ward / Inpatient", href: `${INTERNAL_PREFIX}/nurses/ward`, icon: "hospital" },
        { label: "Emergency Unit", href: `${INTERNAL_PREFIX}/nurses/emergency`, icon: "status" },
        { label: "ICU", href: `${INTERNAL_PREFIX}/nurses/icu`, icon: "view" },
      ],
    },
    {
      section: "Nursing Work",
      items: [
        { label: "Medication Administration", href: `${INTERNAL_PREFIX}/nurses/medication-administration`, icon: "billing" },
        { label: "Sample Collection", href: `${INTERNAL_PREFIX}/nurses/sample-collection`, icon: "hospital" },
        { label: "Observation", href: `${INTERNAL_PREFIX}/nurses/observation`, icon: "reports" },
        { label: "Handover Notes", href: `${INTERNAL_PREFIX}/nurses/handover-notes`, icon: "support" },
        { label: "Procedure Charges", href: `${INTERNAL_PREFIX}/nurses/procedure-charges`, icon: "money" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/nurses/chat`, icon: "support" },
      ],
    },
  ],
  pharmacy: [
    {
      section: "Pharmacy",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/pharmacy`, icon: "dashboard" },
        { label: "Pending Prescriptions", href: `${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`, icon: "hospital" },
        { label: "Inventory", href: `${INTERNAL_PREFIX}/pharmacy/inventory`, icon: "billing" },
        { label: "Nurse Requests", href: `${INTERNAL_PREFIX}/pharmacy/nurse-requests`, icon: "queue" },
        { label: "Stock Movements", href: `${INTERNAL_PREFIX}/pharmacy/stock-movements`, icon: "reports" },
        { label: "Restock Requests", href: `${INTERNAL_PREFIX}/pharmacy/restock-requests`, icon: "queue" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/pharmacy/chat`, icon: "support" },
      ],
    },
  ],
  lab: [
    {
      section: "Laboratory",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/lab`, icon: "dashboard" },
        { label: "Test Requests", href: `${INTERNAL_PREFIX}/lab/test-requests`, icon: "queue" },
        { label: "Sample Collection", href: `${INTERNAL_PREFIX}/lab/sample-collection`, icon: "hospital" },
        { label: "Lab Processing", href: `${INTERNAL_PREFIX}/lab/processing`, icon: "play" },
        { label: "Results Entry", href: `${INTERNAL_PREFIX}/lab/results-entry`, icon: "plus" },
        { label: "Results", href: `${INTERNAL_PREFIX}/lab/results`, icon: "reports" },
        { label: "Test Catalog", href: `${INTERNAL_PREFIX}/lab/test-catalog`, icon: "billing" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/lab/chat`, icon: "support" },
      ],
    },
  ],
  accounts: [
    {
      section: "Accounts",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/accounts`, icon: "dashboard" },
        { label: "Invoices", href: `${INTERNAL_PREFIX}/accounts/invoices`, icon: "money" },
        { label: "Receive Payment", href: `${INTERNAL_PREFIX}/accounts/receive-payment`, icon: "billing" },
        { label: "Consultation Fees", href: `${INTERNAL_PREFIX}/accounts/consultation-fees`, icon: "billing" },
        { label: "Lab Billing", href: `${INTERNAL_PREFIX}/accounts/lab-billing`, icon: "view" },
        { label: "Nursing Billing", href: `${INTERNAL_PREFIX}/accounts/nursing-billing`, icon: "hospital" },
        { label: "Pharmacy Billing", href: `${INTERNAL_PREFIX}/accounts/pharmacy-billing`, icon: "pharmacy" },
        { label: "Payments History", href: `${INTERNAL_PREFIX}/accounts/payments-history`, icon: "reports" },
        { label: "Expenses", href: `${INTERNAL_PREFIX}/accounts/expenses`, icon: "money" },
        { label: "Supplier Payments", href: `${INTERNAL_PREFIX}/accounts/supplier-payments`, icon: "money" },
        { label: "Payroll", href: `${INTERNAL_PREFIX}/accounts/payroll`, icon: "billing" },
        { label: "Kiosk Revenue", href: `${INTERNAL_PREFIX}/accounts/kiosk`, icon: "reports" },
        { label: "Daily Reports", href: `${INTERNAL_PREFIX}/accounts/daily-reports`, icon: "reports" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/accounts/chat`, icon: "support" },
      ],
    },
  ],
  store: dashboardNavigation.length
    ? [
        {
          section: "Store",
          items: [
            { label: "Dashboard", href: `${INTERNAL_PREFIX}/store`, icon: "dashboard" },
            { label: "Inventory", href: `${INTERNAL_PREFIX}/store/inventory`, icon: "billing" },
            { label: "Requests", href: `${INTERNAL_PREFIX}/store/requests`, icon: "queue" },
            { label: "Procurement", href: `${INTERNAL_PREFIX}/store/procurement`, icon: "reports" },
            { label: "Chat to IT", href: `${INTERNAL_PREFIX}/store/chat`, icon: "support" },
          ],
        },
      ]
    : [],
  admin: [
    {
      section: "Overview",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/admin`, icon: "dashboard" },
        { label: "Department Overview", href: `${INTERNAL_PREFIX}/admin/department-monitoring`, icon: "group" },
        { label: "Approvals", href: `${INTERNAL_PREFIX}/admin/approvals`, icon: "queue" },
        { label: "Reports", href: `${INTERNAL_PREFIX}/admin/reports`, icon: "reports" },
        { label: "Audit Logs", href: `${INTERNAL_PREFIX}/admin/audit-logs`, icon: "reports" },
        { label: "Data Export", href: `${INTERNAL_PREFIX}/admin/data-export`, icon: "reports" },
      ],
    },
    {
      section: "Department Monitors",
      items: [
        { label: "Front Desk", href: `${INTERNAL_PREFIX}/admin/frontdesk`, icon: "patients" },
        { label: "Doctors", href: `${INTERNAL_PREFIX}/admin/doctors`, icon: "hospital" },
        { label: "Nurses Bay", href: `${INTERNAL_PREFIX}/admin/nurses`, icon: "group" },
        { label: "Pharmacy", href: `${INTERNAL_PREFIX}/admin/pharmacy`, icon: "billing" },
        { label: "Laboratory", href: `${INTERNAL_PREFIX}/admin/lab`, icon: "view" },
        { label: "Accounts", href: `${INTERNAL_PREFIX}/admin/accounts`, icon: "money" },
        { label: "Store", href: `${INTERNAL_PREFIX}/admin/store`, icon: "reports" },
        { label: "HR", href: `${INTERNAL_PREFIX}/admin/hr`, icon: "group" },
        { label: "IT", href: `${INTERNAL_PREFIX}/admin/it`, icon: "support" },
      ],
    },
    {
      section: "Admin",
      items: [
        { label: "Settings", href: `${INTERNAL_PREFIX}/admin/settings`, icon: "settings" },
        { label: "Chat to IT", href: `${INTERNAL_PREFIX}/admin/chat`, icon: "support" },
      ],
    },
  ],
  hr: [
    {
      section: "HR Overview",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/hr`, icon: "dashboard" },
        { label: "Staff Directory", href: `${INTERNAL_PREFIX}/hr/staff-directory`, icon: "patients" },
        { label: "Department Staffing", href: `${INTERNAL_PREFIX}/hr/department-staffing`, icon: "group" },
      ],
    },
    {
      section: "HR Operations",
      items: [
        { label: "Leave Management", href: `${INTERNAL_PREFIX}/hr/leave-management`, icon: "queue" },
        { label: "Onboarding & Exit", href: `${INTERNAL_PREFIX}/hr/onboarding`, icon: "hospital" },
        { label: "Payroll Preparation", href: `${INTERNAL_PREFIX}/hr/payroll`, icon: "billing" },
        { label: "Payslips", href: `${INTERNAL_PREFIX}/hr/payslips`, icon: "reports" },
        { label: "Roles & Permissions", href: `${INTERNAL_PREFIX}/hr/roles-permissions`, icon: "settings" },
      ],
    },
    {
      section: "HR Admin",
      items: [
        { label: "Chat Inbox", href: `${INTERNAL_PREFIX}/hr/chat`, icon: "support" },
      ],
    },
  ],
  it: [
    {
      section: "IT",
      items: [
        { label: "Dashboard", href: `${INTERNAL_PREFIX}/it`, icon: "dashboard" },
        { label: "Chat Inbox", href: `${INTERNAL_PREFIX}/it/chat`, icon: "support" },
        { label: "Tickets", href: `${INTERNAL_PREFIX}/it/tickets`, icon: "queue" },
        { label: "User Access", href: `${INTERNAL_PREFIX}/it/user-access`, icon: "patients" },
        { label: "System Logs", href: `${INTERNAL_PREFIX}/it/system-logs`, icon: "reports" },
        { label: "Data Export", href: `${INTERNAL_PREFIX}/admin/data-export`, icon: "reports" },
        { label: "System", href: `${INTERNAL_PREFIX}/it/system`, icon: "settings" },
      ],
    },
  ],
  support: [],
  notifications: [],
  profile: [
    {
      section: "My Profile",
      items: [
        { label: "Overview", href: `${INTERNAL_PREFIX}/profile`, icon: "dashboard" },
        { label: "Settings", href: `${INTERNAL_PREFIX}/profile/settings`, icon: "settings" },
        { label: "Security", href: `${INTERNAL_PREFIX}/profile/security`, icon: "status" },
        { label: "Activity Log", href: `${INTERNAL_PREFIX}/profile/activity`, icon: "reports" },
        { label: "Notifications", href: `${INTERNAL_PREFIX}/profile/notifications`, icon: "bell" },
      ],
    },
    {
      section: "HR & Payroll",
      items: [
        { label: "Employment", href: `${INTERNAL_PREFIX}/profile/employment`, icon: "hospital" },
        { label: "Payroll", href: `${INTERNAL_PREFIX}/profile/payroll`, icon: "money" },
        { label: "Leave", href: `${INTERNAL_PREFIX}/profile/leave`, icon: "calendar" },
        { label: "Attendance", href: `${INTERNAL_PREFIX}/profile/attendance`, icon: "status" },
        { label: "Documents", href: `${INTERNAL_PREFIX}/profile/documents`, icon: "reports" },
        { label: "Training", href: `${INTERNAL_PREFIX}/profile/training`, icon: "view" },
        { label: "Permissions", href: `${INTERNAL_PREFIX}/profile/permissions`, icon: "settings" },
      ],
    },
    {
      section: "Support",
      items: [
        { label: "Chat to HR", href: "/staff/chat", icon: "support" },
      ],
    },
  ],
};

export const moduleInventory = [
  {
    title: "User Authentication & Sessions",
    tag: "Security",
    copy: "Email/password login, session controls, reset flows, and MFA-ready structure.",
  },
  {
    title: "Front Desk Registration",
    tag: "Operations",
    copy: "Patient registration, duplicate checks, next-of-kin capture, and visit routing.",
  },
  {
    title: "Doctor Consultation",
    tag: "Clinical",
    copy: "Encounter notes, diagnosis, prescribing, and consultation history.",
  },
  {
    title: "Nursing & Triage",
    tag: "Clinical",
    copy: "Vitals capture, triage prioritization, and medication administration logs.",
  },
  {
    title: "Pharmacy & Inventory",
    tag: "Medication",
    copy: "Prescription review, dispensing, substitutions, and stock movement awareness.",
  },
  {
    title: "Accounts & Billing",
    tag: "Finance",
    copy: "Invoices, receipts, payments, refunds, and day closure workflows.",
  },
  {
    title: "HR & Staff Profiles",
    tag: "People",
    copy: "Staff records, document handling, department assignments, and role lifecycle.",
  },
  {
    title: "IT Support",
    tag: "Internal",
    copy: "Ticket intake, threaded support updates, access management, and login review.",
  },
  {
    title: "Public Booking",
    tag: "Public",
    copy: "Appointment request forms, contact submission, and patient verification.",
  },
];

const baseStats = [
  { label: "Records in flow", value: "148", change: "+9 since 08:00" },
  { label: "Pending actions", value: "12", change: "3 urgent" },
  { label: "Completed today", value: "47", change: "stable throughput" },
  { label: "Escalations", value: "2", change: "requires review" },
];

function makeBoard(
  heading: string,
  subheading: string,
  rows: string[][],
  highlights: Array<{ title: string; copy: string }>,
): WorkspaceBoard {
  return {
    heading,
    subheading,
    stats: baseStats,
    queue: [
      { label: "Priority queue", detail: "4 items", state: "watch" },
      { label: "Standard queue", detail: "8 items", state: "steady" },
      { label: "Escalated review", detail: "2 items", state: "urgent" },
    ],
    highlights,
    table: {
      columns: ["Reference", "Owner", "Context", "Status"],
      rows,
    },
  };
}

export const workspaceBoards: Record<DepartmentKey, WorkspaceBoard> = {
  dashboard: makeBoard("Global Dashboard", "Cross-department operations board.", [["FD-1042", "Front Desk", "Registration backlog", "Monitoring"], ["DOC-2231", "Doctors", "Consultation pressure", "Priority"], ["PHM-1203", "Pharmacy", "Low stock review", "Escalated"], ["ACC-0081", "Accounts", "Invoice follow-up", "Open"]], [{ title: "Shift handover summary", copy: "Triage load increased after noon; allocate one extra nurse to intake." }, { title: "Stock attention", copy: "Amoxicillin suspension is below reorder threshold in central pharmacy." }, { title: "Finance watch", copy: "Three invoices remain unpaid beyond same-day outpatient target." }]),
  frontdesk: makeBoard("Front Desk Workspace", "Patient registration, identity checks, and visit routing.", [["HSP-000245", "Grace Okoro", "New registration", "Queued"], ["VIS-1043", "Mary John", "Visit intake", "Vitals pending"], ["HSP-000247", "Aisha Bello", "Duplicate warning", "Review"], ["VIS-1045", "Paul Obi", "Billing handoff", "Open"]], [{ title: "Identity verification", copy: "Use DOB plus phone confirmation before creating a replacement card." }, { title: "Routing discipline", copy: "Each visit must map to a department before it appears in queue." }, { title: "Audit priority", copy: "Patient edits, next-of-kin changes, and merges are all logged." }]),
  doctors: makeBoard("Doctors Workspace", "Consultation board with diagnosis and prescription intent.", [["ENC-00231", "Dr. Nwosu", "Review vitals", "Open"], ["ENC-00232", "Dr. Madu", "Prescribe", "Active"], ["ENC-00233", "Dr. Kalu", "Order labs", "Pending"], ["ENC-00234", "Dr. Ada", "Close encounter", "Review"]], [{ title: "Structured prescribing", copy: "Prescription stays as clinical intent until pharmacy dispenses and moves stock." }, { title: "Clinical safety", copy: "Critical allergy flags should remain visible in the encounter header." }, { title: "Approvals", copy: "Controlled medications and exceptional substitutions should route through approvals." }]),
  nurses: makeBoard("Nurses Workspace", "Triage, vitals, medication administration, and observation.", [["TRI-0031", "Nurse Sarah", "Orange triage", "Doctor review"], ["VIT-0182", "Nurse Joseph", "Repeat vitals", "Pending"], ["MED-0228", "Nurse Ruth", "Medication round", "Due"], ["OBS-0009", "Nurse Esther", "Observation bay", "Stable"]], [{ title: "Bedside accountability", copy: "Medication logs should capture actor, timestamp, and dose variance reason." }, { title: "Intake discipline", copy: "Triage queue priority must be visible before doctor assignment." }, { title: "Observation notes", copy: "Handovers should summarize trends instead of repeating raw vitals." }]),
  pharmacy: makeBoard("Pharmacy Workspace", "Prescription verification, dispensing, and stock awareness.", [["RX-12031", "Ifeanyi Obi", "Ready to dispense", "Open"], ["RX-12032", "Miriam Udo", "Awaiting stock check", "Review"], ["RX-12033", "Chinwe Ani", "Substitution review", "Pending"], ["RX-12034", "Samuel Emeka", "Dispensed", "Done"]], [{ title: "Dispense rule", copy: "Inventory should only decrement on confirmed dispense, not on prescription creation." }, { title: "Substitution logic", copy: "Pharmacists may propose equivalents but must not change diagnosis." }, { title: "Batch visibility", copy: "Show batch, expiry, and available quantity together in every dispense modal." }]),
  lab: makeBoard("Lab Workspace", "Test requests, sample processing, results entry, and diagnostic turnaround.", [["LAB-001", "Dr. Smith", "FBC — Alice Thompson", "Completed"], ["LAB-002", "Dr. Mensah", "Malaria Test — Kofi Mensah", "In Progress"], ["LAB-003", "Dr. Osei", "Urinalysis — Ama Owusu", "Sample Collected"], ["LAB-004", "Dr. Kalu", "FBS — Mary Ibrahim", "Pending"]], [{ title: "Chain of custody", copy: "Every sample must be linked to the patient, collector, and time before processing begins." }, { title: "Result accuracy", copy: "Reference ranges and interpretation flags should appear alongside every result value." }, { title: "Turnaround discipline", copy: "STAT and Urgent tests should surface prominently and bypass routine queue ordering." }]),
  accounts: makeBoard("Accounts Workspace", "Invoices, payments, refunds, and end-of-day accountability.", [["INV-2026-0081", "Mary Ibrahim", "NGN 36,000", "Paid"], ["INV-2026-0082", "Joseph James", "NGN 84,000", "Pending"], ["INV-2026-0083", "Ruth Cole", "NGN 12,500", "Part paid"], ["INV-2026-0084", "Ahmed Yusuf", "NGN 41,000", "Approval hold"]], [{ title: "Separation of duties", copy: "Refund creation and refund approval must remain independent actions." }, { title: "Patient context", copy: "Accounts can see only the billing minimum needed, not full clinical notes." }, { title: "Audit readiness", copy: "Void, discount, and refund actions should always carry a reason." }]),
  store: makeBoard("Store Workspace", "Internal inventory, procurement requests, and stock issues.", [["REQ-0198", "Pharmacy", "4 items", "Approved"], ["REQ-0199", "Front Desk", "2 items", "Review"], ["REQ-0200", "Nurses", "6 items", "Issued"], ["REQ-0201", "IT", "1 item", "Awaiting approval"]], [{ title: "Traceability", copy: "Every issue out of store should create a stock movement with actor and reason." }, { title: "Department routing", copy: "Requests should remain visible to both requester and approver until fulfilled." }, { title: "Procurement hygiene", copy: "Purchase requests need approval state before conversion to order." }]),
  admin: makeBoard("Admin Workspace", "Approval routing, metrics, compliance checks, and supervision.", [["APR-0042", "Accounts", "Refund request", "Pending"], ["APR-0043", "Pharmacy", "Inventory override", "Escalated"], ["APR-0044", "HR", "Role activation", "Approved"], ["APR-0045", "IT", "Audit export", "Review"]], [{ title: "Control points", copy: "High-risk actions should be dual-layered with service checks and database policies." }, { title: "Audit visibility", copy: "Approvals need a full actor trail, timestamps, and supporting reason notes." }, { title: "Executive view", copy: "KPIs should summarize queue pressure, revenue, stock risk, and support issues together." }]),
  hr: makeBoard("HR Workspace", "Staff records, roles, department postings, and document controls.", [["EMP-0042", "Doctors", "Medical Officer", "Active"], ["EMP-0043", "Nurses", "Charge Nurse", "Credential review"], ["EMP-0044", "Accounts", "Cashier", "Onboarding"], ["EMP-0045", "IT", "Support Analyst", "Role update"]], [{ title: "Profile separation", copy: "Staff profile data should stay distinct from operational department workspace state." }, { title: "Document security", copy: "Sensitive files belong in private storage with signed access links only." }, { title: "Access hygiene", copy: "Role changes should trigger approval and downstream permission refresh." }]),
  it: makeBoard("IT Workspace", "User support, access management, incidents, and diagnostics.", [["IT-1021", "Front Desk", "Access reset", "In progress"], ["IT-1022", "Pharmacy", "Printer", "Queued"], ["IT-1023", "HR", "Role provisioning", "Awaiting approval"], ["IT-1024", "Admin", "Audit export", "Review"]], [{ title: "Least privilege", copy: "IT can support access and devices without broad read access to clinical notes." }, { title: "Device awareness", copy: "Suspicious auth events should combine IP, user agent, and failed-attempt context." }, { title: "Support channels", copy: "Realtime ticket threads must stay scoped by department or ticket identifier only." }]),
  support: makeBoard("Support Board", "Internal support intake spanning helpdesk updates and ownership.", [["IT-1021", "Daniel Cole", "Access issue", "In progress"], ["IT-1022", "Unassigned", "Printer", "New"], ["IT-1023", "Grace Adebayo", "Provisioning", "Awaiting approval"], ["IT-1024", "Daniel Cole", "Export request", "Escalated"]], [{ title: "Ownership", copy: "Every ticket should show creator, assignee, timestamps, and status history." }, { title: "Realtime safety", copy: "Ticket conversations must stay scoped to authorized users and departments." }, { title: "Escalation clarity", copy: "Tickets affecting patient flow should surface directly on the dashboard." }]),
  notifications: makeBoard("Notifications", "Operational feed for approvals, stock risk, and internal updates.", [["09:14", "Pharmacy", "Amoxicillin low stock", "Critical"], ["09:27", "Accounts", "Refund approval needed", "Pending"], ["09:42", "Support", "Ticket IT-1022 assigned", "New"], ["10:05", "Public", "Appointment request submitted", "Info"]], [{ title: "Signal quality", copy: "Notifications should stay concise and action-oriented instead of duplicating full records." }, { title: "Routing", copy: "Department-specific alerts should use the user's assignment and permissions." }, { title: "Audit support", copy: "Important delivery and read events should be attributable when required." }]),
  profile: makeBoard("Staff Profile", "Personal profile, security settings, and session visibility.", [["08:21", "Login", "Chrome / London", "Success"], ["08:34", "Dashboard", "Global board", "Allowed"], ["09:12", "Ticket update", "IT-1021", "Logged"], ["09:38", "Profile", "Security tab", "Allowed"]], [{ title: "Separation of concerns", copy: "Profile management should never be confused with departmental workspace permissions." }, { title: "Session control", copy: "The user should be able to see and revoke active devices later in the auth flow." }, { title: "Security readiness", copy: "The structure already anticipates MFA, device fingerprinting, and breach monitoring." }]),
};

export function getDepartmentFromPath(pathname: string): DepartmentKey {
  if (!pathname.startsWith(INTERNAL_PREFIX + "/")) {
    return "dashboard";
  }

  const directMatch = dashboardNavigation
    .flatMap((section) => section.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return directMatch?.department ?? "dashboard";
}

export function findNavigationItem(pathname: string) {
  return dashboardNavigation
    .flatMap((section) => section.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function getSidebarSections(department: DepartmentKey) {
  return sidebarNavigationByDepartment[department];
}

export const departmentHomePaths: Record<DepartmentKey, string> = {
  dashboard: `${INTERNAL_PREFIX}/dashboard`,
  frontdesk: `${INTERNAL_PREFIX}/frontdesk`,
  doctors: `${INTERNAL_PREFIX}/doctors`,
  nurses: `${INTERNAL_PREFIX}/nurses`,
  pharmacy: `${INTERNAL_PREFIX}/pharmacy`,
  lab: `${INTERNAL_PREFIX}/lab`,
  accounts: `${INTERNAL_PREFIX}/accounts`,
  store: `${INTERNAL_PREFIX}/store`,
  admin: `${INTERNAL_PREFIX}/admin`,
  hr: `${INTERNAL_PREFIX}/hr`,
  it: `${INTERNAL_PREFIX}/it`,
  support: `${INTERNAL_PREFIX}/chat`,
  notifications: `${INTERNAL_PREFIX}/notifications`,
  profile: `${INTERNAL_PREFIX}/profile`,
};

export const sharedProtectedPrefixes = [
  `${INTERNAL_PREFIX}/notifications`,
  `${INTERNAL_PREFIX}/profile`,
] as const;
