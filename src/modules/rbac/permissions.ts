/**
 * RBAC Permission constants.
 *
 * Format: {department}:{resource}:{action}
 * Special: '*:*:*' is the admin wildcard — matches everything.
 *
 * These strings must match what is seeded in 0022_seed_permissions.sql.
 */

export const PERMISSIONS = {
  // ── Patients ─────────────────────────────────────────────────────────────
  patients: {
    create: "patients:create",
    read:   "patients:read",
    update: "patients:update",
  },

  // ── Visits ───────────────────────────────────────────────────────────────
  visits: {
    create: "visits:create",
    read:   "visits:read",
  },

  // ── Appointments ─────────────────────────────────────────────────────────
  appointments: {
    create: "appointments:create",
    read:   "appointments:read",
    update: "appointments:update",
  },

  // ── Consultations ─────────────────────────────────────────────────────────
  consultations: {
    create: "consultations:create",
    read:   "consultations:read",
    update: "consultations:update",
  },

  // ── Prescriptions ─────────────────────────────────────────────────────────
  prescriptions: {
    create: "prescriptions:create",
    read:   "prescriptions:read",
  },

  // ── Lab ───────────────────────────────────────────────────────────────────
  lab: {
    tests: {
      create:  "lab:tests:create",
      read:    "lab:tests:read",
      process: "lab:tests:process",
    },
    results: {
      create: "lab:results:create",
      read:   "lab:results:read",
      update: "lab:results:update",
    },
    samples: {
      collect: "lab:samples:collect",
      receive: "lab:samples:receive",
    },
  },

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  pharmacy: {
    prescriptions: {
      read:     "pharmacy:prescriptions:read",
      dispense: "pharmacy:prescriptions:dispense",
    },
    inventory: {
      read:   "pharmacy:inventory:read",
      update: "pharmacy:inventory:update",
    },
    restocking: {
      create: "pharmacy:restocking:create",
    },
  },

  // ── Nursing ───────────────────────────────────────────────────────────────
  nursing: {
    procedures:   { create: "nursing:procedures:create" },
    handover:     { create: "nursing:handover:create" },
    observations: { create: "nursing:observations:create" },
    medications:  { administer: "medications:administer" },
    admissions:   { create: "nurses:admissions:create" },
  },

  vitals: {
    create: "vitals:create",
    read:   "vitals:read",
  },

  // ── Accounts ──────────────────────────────────────────────────────────────
  accounts: {
    invoices: {
      create: "accounts:invoices:create",
      read:   "accounts:invoices:read",
      update: "accounts:invoices:update",
    },
    payments: {
      create: "accounts:payments:create",
      read:   "accounts:payments:read",
    },
    payroll: {
      process: "accounts:payroll:process",
    },
    reports: {
      read: "accounts:reports:read",
    },
    fees: {
      read: "accounts:fees:read",
    },
  },

  // ── Store ─────────────────────────────────────────────────────────────────
  store: {
    inventory:   { read: "store:inventory:read", update: "store:inventory:update" },
    requests:    { read: "store:requests:read",  fulfill: "store:requests:fulfill" },
    procurement: { create: "store:procurement:create" },
  },

  // ── HR ────────────────────────────────────────────────────────────────────
  hr: {
    staff:      { read: "hr:staff:read", create: "hr:staff:create", update: "hr:staff:update" },
    leave:      { read: "hr:leave:read", approve: "hr:leave:approve", reject: "hr:leave:reject" },
    payroll:    { read: "hr:payroll:read", prepare: "hr:payroll:prepare" },
    onboarding: { create: "hr:onboarding:create", update: "hr:onboarding:update" },
    offboarding:{ create: "hr:offboarding:create", update: "hr:offboarding:update" },
    roles:      { read: "hr:roles:read" },
  },

  // ── IT ────────────────────────────────────────────────────────────────────
  it: {
    tickets:    { create: "it:tickets:create", read: "it:tickets:read", update: "it:tickets:update", close: "it:tickets:close" },
    useraccess: { read: "it:useraccess:read", create: "it:useraccess:create", revoke: "it:useraccess:revoke" },
    system:     { read: "it:system:read" },
  },

  // ── Rota (cross-department, HOD) ──────────────────────────────────────────
  rota: {
    create: "rota:create",
    edit:   "rota:edit",
    read:   "rota:read",
  },

  // ── Leave (HOD approvals) ─────────────────────────────────────────────────
  leave: {
    approve: "leave:approve",
    reject:  "leave:reject",
  },

  // ── Department head ───────────────────────────────────────────────────────
  department: {
    reports: { view: "department:reports:view" },
    staff:   { view: "department:staff:view" },
  },

  // ── Admin wildcard ────────────────────────────────────────────────────────
  WILDCARD: "*:*:*",
} as const;

/** Flat union of all permission strings */
export type Permission = string;

/**
 * Check if a permissions array satisfies a required permission.
 * Admin wildcard '*:*:*' passes all checks.
 */
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(PERMISSIONS.WILDCARD) || permissions.includes(required);
}

/**
 * Check if a permissions array satisfies ANY of the required permissions.
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  if (permissions.includes(PERMISSIONS.WILDCARD)) return true;
  return required.some((p) => permissions.includes(p));
}
