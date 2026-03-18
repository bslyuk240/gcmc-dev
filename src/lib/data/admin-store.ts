/**
 * Admin Cross-Department Oversight Store
 *
 * Admin monitors operational data from all 9 departments.
 * This store holds approval queues, system alerts, and
 * department-level operational signals for Admin oversight.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApprovalCategory = "Financial" | "Procurement" | "HR" | "Clinical" | "IT" | "Other";
export type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Escalated";

export type AdminApproval = {
  id: string;
  department: string;
  category: ApprovalCategory;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: string;
  amount?: number;
  priority: "Low" | "Normal" | "High" | "Critical";
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};

export type DeptAlert = {
  id: string;
  department: string;
  level: "Info" | "Warning" | "Critical";
  message: string;
  time: string;
  resolved: boolean;
};

export type ITTicket = {
  id: string;
  title: string;
  department: string;
  priority: "Normal" | "High" | "Urgent" | "Critical";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  assignedTo: string;
  openedAt: string;
  resolvedAt?: string;
};

export type StoreItem = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  status: "OK" | "Low Stock" | "Critical" | "Out of Stock";
};

export type StorePO = {
  id: string;
  supplier: string;
  items: number;
  value: number;
  requestedBy: string;
  requestedAt: string;
  expectedDate: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Sent" | "Received" | "Rejected";
};

export type HRStaff = {
  id: string;
  name: string;
  department: string;
  role: string;
  status: "Active" | "On Leave" | "Suspended" | "Inactive";
  joinDate: string;
};

export type HRLeaveRequest = {
  id: string;
  staffName: string;
  department: string;
  leaveType: "Annual" | "Sick" | "Maternity" | "Paternity" | "Personal" | "Emergency";
  startDate: string;
  endDate: string;
  days: number;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
};

// ─── Store State ──────────────────────────────────────────────────────────────

type AdminStoreState = {
  approvals: AdminApproval[];
  alerts: DeptAlert[];
  itTickets: ITTicket[];
  storeItems: StoreItem[];
  storePOs: StorePO[];
  hrStaff: HRStaff[];
  hrLeaveRequests: HRLeaveRequest[];
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED: AdminStoreState = {
  approvals: [],
  alerts: [],
  itTickets: [],
  storeItems: [],
  storePOs: [],
  hrStaff: [],
  hrLeaveRequests: [],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_admin_store";
const EMPTY_STATE: AdminStoreState = {
  approvals: [],
  alerts: [],
  itTickets: [],
  storeItems: [],
  storePOs: [],
  hrStaff: [],
  hrLeaveRequests: [],
};

function loadState(): AdminStoreState {
  return EMPTY_STATE;
}

function saveState(s: AdminStoreState) {
  void s;
}

let _state: AdminStoreState | null = null;
function getState(): AdminStoreState {
  if (!_state) _state = loadState();
  return _state;
}

function mutate(updater: (s: AdminStoreState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  listeners.forEach((l) => l());
}

const listeners = new Set<() => void>();
export function subscribeAdminStore(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _synced = false;
export async function syncAdminFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const {
      fetchAdminApprovals,
      fetchDeptAlerts,
      fetchITTickets,
      fetchStoreItems,
      fetchStorePOs,
      fetchStaffMembers,
      fetchLeaveRequests,
    } = await import("@/lib/supabase/db");
    const [approvals, alerts, itTickets, storeItems, storePOs, staff, leaveRequests] = await Promise.all([
      fetchAdminApprovals(),
      fetchDeptAlerts(),
      fetchITTickets(),
      fetchStoreItems(),
      fetchStorePOs(),
      fetchStaffMembers(),
      fetchLeaveRequests(),
    ]);
    _state = {
      approvals,
      alerts,
      itTickets,
      storeItems,
      storePOs,
      hrStaff: staff.map((member) => ({
        id: member.id,
        name: member.name,
        department: member.department,
        role: member.role,
        status:
          member.status === "Terminated"
            ? "Inactive"
            : member.status === "Probation"
              ? "Active"
              : member.status,
        joinDate: member.joinDate,
      })),
      hrLeaveRequests: leaveRequests.map((request) => ({
        id: request.id,
        staffName: request.staffName,
        department: request.department,
        leaveType: request.leaveType === "Study" ? "Personal" : request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: request.days,
        status: request.status === "Cancelled" ? "Rejected" : request.status,
        submittedAt: request.submittedAt,
      })),
    };
    listeners.forEach((l) => l());
    _synced = true;
  } catch { /* keep empty Supabase-backed state */ }
}

// ─── Approvals ────────────────────────────────────────────────────────────────

export function getApprovals(): AdminApproval[] { return [...getState().approvals]; }
export function updateApprovalStatus(id: string, status: ApprovalStatus, reviewedBy: string, notes?: string) {
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  mutate((s) => {
    s.approvals = s.approvals.map((a) => a.id === id
      ? { ...a, status, reviewedBy, reviewedAt: `${now} · Mar 15, 2026`, notes: notes ?? a.notes }
      : a,
    );
  });
}
export function addApproval(a: AdminApproval) {
  mutate((s) => { s.approvals = [a, ...s.approvals]; });
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function getDeptAlerts(): DeptAlert[] { return [...getState().alerts]; }
export function resolveAlert(id: string) {
  mutate((s) => { s.alerts = s.alerts.map((a) => a.id === id ? { ...a, resolved: true } : a); });
}

// ─── IT Tickets ───────────────────────────────────────────────────────────────

export function getITTickets(): ITTicket[] { return [...getState().itTickets]; }
export function updateITTicket(id: string, updates: Partial<ITTicket>) {
  mutate((s) => { s.itTickets = s.itTickets.map((t) => t.id === id ? { ...t, ...updates } : t); });
}

// ─── Store / Procurement ─────────────────────────────────────────────────────

export function getStoreItems(): StoreItem[] { return [...getState().storeItems]; }
export function getStorePOs(): StorePO[] { return [...getState().storePOs]; }
export function updatePOStatus(id: string, status: StorePO["status"]) {
  mutate((s) => { s.storePOs = s.storePOs.map((p) => p.id === id ? { ...p, status } : p); });
}

// ─── HR ───────────────────────────────────────────────────────────────────────

export function getHRStaff(): HRStaff[] { return [...getState().hrStaff]; }
export function getHRLeaveRequests(): HRLeaveRequest[] { return [...getState().hrLeaveRequests]; }
export function updateLeaveStatus(id: string, status: HRLeaveRequest["status"]) {
  mutate((s) => { s.hrLeaveRequests = s.hrLeaveRequests.map((l) => l.id === id ? { ...l, status } : l); });
}

// ─── Admin Metrics ────────────────────────────────────────────────────────────

export function getAdminMetrics() {
  const s = getState();
  const pending = s.approvals.filter((a) => a.status === "Pending" || a.status === "Escalated");
  const critical = s.alerts.filter((a) => !a.resolved && a.level === "Critical");
  const warnings = s.alerts.filter((a) => !a.resolved && a.level === "Warning");
  const openTickets = s.itTickets.filter((t) => t.status === "Open" || t.status === "In Progress");
  const criticalTickets = s.itTickets.filter((t) => (t.status === "Open" || t.status === "In Progress") && (t.priority === "Critical" || t.priority === "Urgent"));
  const stockAlerts = s.storeItems.filter((i) => i.status !== "OK");
  const pendingLeave = s.hrLeaveRequests.filter((l) => l.status === "Pending");
  const pendingPOs = s.storePOs.filter((p) => p.status === "Pending Approval");

  return {
    pendingApprovals: pending.length,
    escalatedApprovals: s.approvals.filter((a) => a.status === "Escalated").length,
    criticalAlerts: critical.length,
    warningAlerts: warnings.length,
    totalActiveAlerts: critical.length + warnings.length,
    openITTickets: openTickets.length,
    criticalITTickets: criticalTickets.length,
    stockAlerts: stockAlerts.length,
    criticalStock: s.storeItems.filter((i) => i.status === "Critical" || i.status === "Out of Stock").length,
    pendingLeave: pendingLeave.length,
    totalStaff: s.hrStaff.filter((s) => s.status === "Active").length,
    staffOnLeave: s.hrStaff.filter((s) => s.status === "On Leave").length,
    pendingPOs: pendingPOs.length,
    pendingPOValue: pendingPOs.reduce((sum, p) => sum + p.value, 0),
  };
}
