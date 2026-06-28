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
  ticketRef: string;
  title: string;
  department: string;
  priority: "Normal" | "High" | "Urgent" | "Critical" | "Low" | "Medium";
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
  status: "Draft" | "Pending Approval" | "Approved" | "Sent" | "Confirmed" | "Received" | "Rejected" | "Cancelled";
  description?: string;
  paymentSubmitted?: boolean;
  raisedBy?: string;
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
  if (typeof window === "undefined") return;
  try {
    const {
      fetchAdminApprovals,
      fetchDeptAlerts,
      fetchStorePOs,
      fetchStaffMembers,
    } = await import("@/lib/supabase/db");
    const itemsRes = await fetch("/api/store/items");
    const itemsJson = itemsRes.ok ? await itemsRes.json() : { items: [] };
    const storeItems = (itemsJson.items ?? []).map((item: {
      id: string;
      name: string;
      category: string;
      currentStock: number;
      reorderLevel: number;
      unit: string;
      status: string;
    }) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      status: item.status === "OK" ? "OK" : item.status === "Out of Stock" ? "Out of Stock" : item.status === "Critical" ? "Critical" : "Low Stock",
    }));
    const [approvals, alerts, storePOs, staff, ticketsResult] = await Promise.all([
      fetchAdminApprovals(),
      fetchDeptAlerts(),
      fetchStorePOs(),
      fetchStaffMembers(),
      fetch("/api/it/tickets").then((res) => (res.ok ? res.json() : null)),
    ]);
    const itTickets = ticketsResult?.tickets
      ? ticketsResult.tickets.map((t: {
          id: string;
          ticketRef: string;
          title: string;
          department: string;
          priority: ITTicket["priority"];
          status: ITTicket["status"];
          assignedTo: string;
          openedAt: string;
          resolvedAt: string | null;
        }) => ({
          id: t.id,
          ticketRef: t.ticketRef,
          title: t.title,
          department: t.department,
          priority: t.priority,
          status: t.status,
          assignedTo: t.assignedTo,
          openedAt: t.openedAt,
          resolvedAt: t.resolvedAt ?? undefined,
        }))
      : getState().itTickets;
    const current = getState();
    _state = {
      approvals: mergeById(approvals, current.approvals),
      alerts: mergeById(alerts, current.alerts),
      itTickets,
      storeItems: mergeById(storeItems, current.storeItems),
      storePOs: mergeById(storePOs, current.storePOs),
      hrStaff: staff.length
        ? staff.map((member) => ({
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
          }))
        : current.hrStaff,
      hrLeaveRequests: current.hrLeaveRequests,
    };
    saveState(_state);
    listeners.forEach((l) => l());
    _synced = true;
  } catch { /* keep local state */ }
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]) {
  if (!remote.length) return local;
  const remoteIds = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
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
export async function updateITTicket(id: string, updates: Partial<ITTicket>) {
  const res = await fetch("/api/it/tickets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId: id,
      status: updates.status,
      priority: updates.priority,
      assignedToName: updates.assignedTo,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Could not update ticket.");
  }
  const updated = data.ticket as {
    id: string;
    ticketRef: string;
    title: string;
    department: string;
    priority: ITTicket["priority"];
    status: ITTicket["status"];
    assignedTo: string;
    openedAt: string;
    resolvedAt: string | null;
  };
  mutate((s) => {
    s.itTickets = s.itTickets.map((t) => t.id === id ? {
      id: updated.id,
      ticketRef: updated.ticketRef,
      title: updated.title,
      department: updated.department,
      priority: updated.priority,
      status: updated.status,
      assignedTo: updated.assignedTo,
      openedAt: updated.openedAt,
      resolvedAt: updated.resolvedAt ?? undefined,
    } : t);
  });
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
