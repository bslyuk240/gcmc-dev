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
  approvals: [
    {
      id: "APR-001", department: "Accounts", category: "Financial",
      title: "Patient Refund — Alice Thompson", description: "Refund request for duplicate payment of ₦240. Lab billing error.",
      requestedBy: "Cashier Mary", requestedAt: "09:15 AM · Mar 15, 2026",
      amount: 240, priority: "Normal", status: "Pending",
    },
    {
      id: "APR-002", department: "Store", category: "Procurement",
      title: "Emergency Medical Supplies PO — ₦12,500",
      description: "Urgent procurement of gloves, gauze, and IV sets from MedSupply Co. Stock critically low.",
      requestedBy: "Store Manager", requestedAt: "08:40 AM · Mar 15, 2026",
      amount: 12500, priority: "High", status: "Pending",
    },
    {
      id: "APR-003", department: "HR", category: "HR",
      title: "New Hire Activation — Lab Technician",
      description: "Activate Dr. Mensah's lab technician account. Background check cleared.",
      requestedBy: "HR Manager", requestedAt: "Mar 14, 2026",
      priority: "Normal", status: "Approved",
      reviewedBy: "Admin Dr. Asante", reviewedAt: "Mar 14, 2026 · 11:00 AM",
    },
    {
      id: "APR-004", department: "Pharmacy", category: "Clinical",
      title: "Inventory Override — Controlled Substance",
      description: "Pharmacy requests manual override to issue morphine stock outside standard dispensing protocol for ICU patient.",
      requestedBy: "Head Pharmacist", requestedAt: "10:30 AM · Mar 15, 2026",
      priority: "High", status: "Escalated",
    },
    {
      id: "APR-005", department: "IT", category: "IT",
      title: "System Audit Export Request",
      description: "IT team requests export of access logs for compliance audit covering last 90 days.",
      requestedBy: "IT Lead", requestedAt: "09:50 AM · Mar 15, 2026",
      priority: "Normal", status: "Pending",
    },
    {
      id: "APR-006", department: "Accounts", category: "Financial",
      title: "Major Expense Approval — Generator Fuel",
      description: "Monthly generator fuel cost of ₦8,200 — above department threshold requiring admin approval.",
      requestedBy: "Accounts Manager", requestedAt: "Mar 13, 2026",
      amount: 8200, priority: "Normal", status: "Approved",
      reviewedBy: "Admin Dr. Asante", reviewedAt: "Mar 14, 2026 · 09:00 AM",
    },
    {
      id: "APR-007", department: "HR", category: "HR",
      title: "Staff Suspension — Disciplinary Action",
      description: "HR recommends 2-week suspension for Nurse James (Nurses, Ward) pending investigation.",
      requestedBy: "HR Manager", requestedAt: "Mar 14, 2026",
      priority: "High", status: "Pending",
    },
  ],
  alerts: [
    { id: "ALT-001", department: "Pharmacy", level: "Warning", message: "Amoxicillin stock below reorder level (18 units remaining, reorder at 50).", time: "09:00 AM", resolved: false },
    { id: "ALT-002", department: "Lab", level: "Warning", message: "3 STAT tests pending over 2 hours. Lab backlog risk.", time: "10:15 AM", resolved: false },
    { id: "ALT-003", department: "ICU", level: "Critical", message: "2 critical patients — continuous monitoring active. Notify senior doctor if deterioration.", time: "10:05 AM", resolved: false },
    { id: "ALT-004", department: "IT", level: "Warning", message: "Ward 3 terminal offline. IT in progress (IT-1027).", time: "09:42 AM", resolved: false },
    { id: "ALT-005", department: "Store", level: "Critical", message: "Patient wristbands out of stock. Affects Front Desk registration.", time: "08:30 AM", resolved: false },
    { id: "ALT-006", department: "Accounts", level: "Info", message: "2 payroll batches submitted and awaiting approval.", time: "08:00 AM", resolved: false },
  ],
  itTickets: [
    { id: "IT-1028", title: "Printer offline — Registration", department: "Front Desk", priority: "Urgent", status: "Open", assignedTo: "John IT", openedAt: "10 min ago" },
    { id: "IT-1027", title: "Ward 3 terminal offline", department: "Nurses", priority: "Critical", status: "In Progress", assignedTo: "John IT", openedAt: "42 min ago" },
    { id: "IT-1026", title: "Dispensing module slowness", department: "Pharmacy", priority: "High", status: "In Progress", assignedTo: "Ama IT", openedAt: "1h ago" },
    { id: "IT-1025", title: "EMR access for Dr. Chen", department: "Doctors", priority: "Normal", status: "Resolved", assignedTo: "Ama IT", openedAt: "2h ago", resolvedAt: "1h ago" },
    { id: "IT-1024", title: "Audit export request", department: "Admin", priority: "Normal", status: "Resolved", assignedTo: "John IT", openedAt: "3h ago", resolvedAt: "2h ago" },
    { id: "IT-1023", title: "Role provisioning — new hire", department: "HR", priority: "Normal", status: "Open", assignedTo: "Ama IT", openedAt: "Mar 14" },
  ],
  storeItems: [
    { id: "STK-001", name: "Amoxicillin 500mg Cap", category: "Pharmaceuticals", currentStock: 18, reorderLevel: 50, unit: "Bottles", status: "Critical" },
    { id: "STK-002", name: "Gauze Bandages 10cm", category: "Wound Care", currentStock: 8, reorderLevel: 20, unit: "Packs", status: "Critical" },
    { id: "STK-003", name: "Patient Wristbands", category: "Administration", currentStock: 0, reorderLevel: 10, unit: "Boxes", status: "Out of Stock" },
    { id: "STK-004", name: "N95 Respirators", category: "PPE", currentStock: 35, reorderLevel: 40, unit: "Boxes", status: "Low Stock" },
    { id: "STK-005", name: "Oxygen Masks (Adult)", category: "Respiratory", currentStock: 18, reorderLevel: 25, unit: "Units", status: "Low Stock" },
    { id: "STK-006", name: "IV Saline 0.9% 500ml", category: "IV Fluids", currentStock: 120, reorderLevel: 80, unit: "Bags", status: "OK" },
    { id: "STK-007", name: "Disposable Syringes 5ml", category: "Consumables", currentStock: 480, reorderLevel: 200, unit: "Pieces", status: "OK" },
    { id: "STK-008", name: "Surgical Gloves (M)", category: "PPE", currentStock: 310, reorderLevel: 100, unit: "Pairs", status: "OK" },
  ],
  storePOs: [
    { id: "PO-1142", supplier: "MedSupply Co.", items: 5, value: 2840, requestedBy: "Store Manager", requestedAt: "Mar 14, 2026", expectedDate: "Mar 19", status: "Approved" },
    { id: "PO-1141", supplier: "SafeGuard Ltd.", items: 3, value: 1260, requestedBy: "Store Manager", requestedAt: "Mar 13, 2026", expectedDate: "Mar 18", status: "Sent" },
    { id: "PO-1143", supplier: "MedSupply Co.", items: 4, value: 760, requestedBy: "Store Manager", requestedAt: "Mar 15, 2026", expectedDate: "Mar 21", status: "Pending Approval" },
    { id: "PO-1144", supplier: "PharmaCo Ltd.", items: 8, value: 12500, requestedBy: "Store Manager", requestedAt: "Mar 15, 2026", expectedDate: "Mar 20", status: "Pending Approval" },
  ],
  hrStaff: [
    { id: "EMP-001", name: "Dr. Amaka Osei", department: "Doctors", role: "Senior Medical Officer", status: "Active", joinDate: "Jan 2022" },
    { id: "EMP-002", name: "Nurse Patricia", department: "Nurses", role: "Charge Nurse", status: "Active", joinDate: "Mar 2021" },
    { id: "EMP-003", name: "James Adu", department: "Pharmacy", role: "Pharmacist", status: "Active", joinDate: "Jun 2023" },
    { id: "EMP-004", name: "Tom Kwesi", department: "Front Desk", role: "Registration Officer", status: "Active", joinDate: "Sep 2022" },
    { id: "EMP-005", name: "Sarah Mensah", department: "Accounts", role: "Senior Accountant", status: "On Leave", joinDate: "Apr 2020" },
    { id: "EMP-006", name: "Nurse Sandra", department: "Nurses (ICU)", role: "ICU Nurse", status: "Active", joinDate: "Jul 2021" },
    { id: "EMP-007", name: "John Darko", department: "IT", role: "IT Support Lead", status: "Active", joinDate: "Jan 2023" },
    { id: "EMP-008", name: "Grace Asante", department: "Lab", role: "Lab Technician", status: "Active", joinDate: "Nov 2022" },
  ],
  hrLeaveRequests: [
    { id: "LV-001", staffName: "Dr. Amaka Osei", department: "Doctors", leaveType: "Annual", startDate: "Dec 20", endDate: "Dec 31", days: 8, status: "Pending", submittedAt: "Mar 10, 2026" },
    { id: "LV-002", staffName: "Nurse Patricia", department: "Nurses", leaveType: "Sick", startDate: "Mar 16", endDate: "Mar 17", days: 2, status: "Approved", submittedAt: "Mar 15, 2026" },
    { id: "LV-003", staffName: "James Adu", department: "Pharmacy", leaveType: "Annual", startDate: "Apr 1", endDate: "Apr 5", days: 4, status: "Pending", submittedAt: "Mar 12, 2026" },
    { id: "LV-004", staffName: "Tom Kwesi", department: "Front Desk", leaveType: "Personal", startDate: "Mar 20", endDate: "Mar 20", days: 1, status: "Approved", submittedAt: "Mar 14, 2026" },
    { id: "LV-005", staffName: "Sarah Mensah", department: "Accounts", leaveType: "Maternity", startDate: "Feb 1", endDate: "Apr 30", days: 60, status: "Approved", submittedAt: "Jan 20, 2026" },
  ],
};

// ─── Internal state ───────────────────────────────────────────────────────────

const STORAGE_KEY = "hms_admin_store";

function loadState(): AdminStoreState {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AdminStoreState;
  } catch { /* ignore */ }
  return SEED;
}

function saveState(s: AdminStoreState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
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
