/**
 * Cross-department notification store.
 * Each notification targets specific departments — staff only see their own.
 * Admin always sees everything.
 */

import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifCategory =
  | "prescription"
  | "lab"
  | "nursing"
  | "accounts"
  | "hr"
  | "doctor"
  | "frontdesk"
  | "pharmacy"
  | "admin"
  | "it"
  | "store";

export type NotifSeverity = "info" | "warning" | "urgent" | "success";

/** Department keys that match the URL segments (e.g. "nurses", "frontdesk") */
export type DeptKey =
  | "frontdesk"
  | "doctors"
  | "nurses"
  | "pharmacy"
  | "lab"
  | "accounts"
  | "store"
  | "hr"
  | "admin"
  | "it";

export type AppNotification = {
  id: string;
  category: NotifCategory;
  severity: NotifSeverity;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  isRead: boolean;
  /**
   * Which departments see this notification.
   * "all" = every department (system-wide).
   * Admin always sees all notifications regardless of this field.
   */
  targetDepartments: DeptKey[] | "all";
};

type NotifState = {
  notifications: AppNotification[];
  toastedIds: string[];
};

// ─── Display helpers ──────────────────────────────────────────────────────────

export const NOTIF_ICONS: Record<NotifCategory, string> = {
  prescription: "💊",
  lab:          "🧪",
  nursing:      "🩺",
  accounts:     "💰",
  hr:           "👥",
  doctor:       "🩻",
  frontdesk:    "🏥",
  pharmacy:     "💊",
  admin:        "📋",
  it:           "💻",
  store:        "📦",
};

export const SEVERITY_RING: Record<NotifSeverity, string> = {
  urgent:  "border-l-red-400",
  warning: "border-l-amber-400",
  success: "border-l-emerald-400",
  info:    "border-l-blue-400",
};

export const SEVERITY_BG: Record<NotifSeverity, string> = {
  urgent:  "bg-red-50",
  warning: "bg-amber-50",
  success: "bg-emerald-50",
  info:    "bg-blue-50",
};

export const SEVERITY_BADGE: Record<NotifSeverity, string> = {
  urgent:  "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  info:    "bg-blue-100 text-blue-700",
};

// ─── Seed data (with per-department targeting) ────────────────────────────────

const SEED: AppNotification[] = [
  // ── URGENT ──
  {
    id: "N001", category: "lab", severity: "urgent",
    title: "STAT Test: Immediate Attention",
    body: "TB Culture for Kofi Mensah is STAT — lab processing required now.",
    href: `${INTERNAL_PREFIX}/lab/test-requests`,
    createdAt: "08:12 AM", isRead: false,
    targetDepartments: ["lab", "doctors", "admin"],
  },
  {
    id: "N002", category: "nursing", severity: "urgent",
    title: "Critical Patient — ICU",
    body: "Kwame Asante (ICU) flagged critical. Vitals require immediate review.",
    href: `${INTERNAL_PREFIX}/nurses/icu`,
    createdAt: "08:35 AM", isRead: false,
    targetDepartments: ["nurses", "doctors", "admin"],
  },

  // ── WARNING ──
  {
    id: "N003", category: "accounts", severity: "warning",
    title: "Payroll Awaiting Approval",
    body: "March 2026 payroll batch — ₦428,500 for 47 staff submitted by HR.",
    href: `${INTERNAL_PREFIX}/accounts/payroll`,
    createdAt: "09:00 AM", isRead: false,
    targetDepartments: ["accounts", "admin"],
  },
  {
    id: "N004", category: "pharmacy", severity: "warning",
    title: "Low Stock Alert",
    body: "Gauze Bandages 10cm: 8 units remaining (reorder threshold: 20).",
    href: `${INTERNAL_PREFIX}/pharmacy/inventory`,
    createdAt: "09:14 AM", isRead: false,
    targetDepartments: ["pharmacy", "store", "admin"],
  },
  {
    id: "N005", category: "prescription", severity: "warning",
    title: "6 Prescriptions Pending Dispensing",
    body: "Prescriptions from Dr. Osei, Dr. Mensah, and Dr. Chen await pharmacy.",
    href: `${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`,
    createdAt: "09:30 AM", isRead: false,
    targetDepartments: ["pharmacy"],
  },
  {
    id: "N006", category: "hr", severity: "warning",
    title: "3 Leave Requests Pending",
    body: "Staff leave applications require HR review and approval.",
    href: `${INTERNAL_PREFIX}/hr/leave-management`,
    createdAt: "09:45 AM", isRead: false,
    targetDepartments: ["hr", "admin"],
  },
  {
    id: "N007", category: "accounts", severity: "warning",
    title: "Supplier Payment Overdue",
    body: "SafeGuard Ltd — PO-2024-0041 for ₦12,400 is past the due date.",
    href: `${INTERNAL_PREFIX}/accounts/supplier-payments`,
    createdAt: "10:20 AM", isRead: false,
    targetDepartments: ["accounts", "admin"],
  },
  {
    id: "N008", category: "it", severity: "warning",
    title: "IT Ticket Opened",
    body: "Pharmacy: Barcode scanner not connecting — Ticket #IT-2024-0042 raised.",
    href: `${INTERNAL_PREFIX}/it/tickets`,
    createdAt: "11:30 AM", isRead: false,
    targetDepartments: ["it", "pharmacy", "admin"],
  },

  // ── SUCCESS ──
  {
    id: "N009", category: "lab", severity: "success",
    title: "Lab Results Ready",
    body: "FBC and Malaria results for Alice Thompson (PT-8234) are complete.",
    href: `${INTERNAL_PREFIX}/lab/results`,
    createdAt: "10:05 AM", isRead: true,
    targetDepartments: ["doctors", "lab"],
  },
  {
    id: "N010", category: "accounts", severity: "success",
    title: "Supplier Payment Processed",
    body: "MedEquip Co. payment ₦8,500 approved and processed successfully.",
    href: `${INTERNAL_PREFIX}/accounts/supplier-payments`,
    createdAt: "10:50 AM", isRead: true,
    targetDepartments: ["accounts", "store"],
  },
  {
    id: "N016", category: "pharmacy", severity: "success",
    title: "Prescription Dispensed",
    body: "RX-8820 for Kofi Mensah dispensed — Aspirin 75mg + Atorvastatin 40mg.",
    href: `${INTERNAL_PREFIX}/pharmacy/pending-prescriptions`,
    createdAt: "10:55 AM", isRead: true,
    targetDepartments: ["pharmacy", "doctors", "nurses"],
  },

  // ── INFO ──
  {
    id: "N011", category: "frontdesk", severity: "info",
    title: "New Patient Registered",
    body: "Alice Meriwether (P-89230) registered. Added to consultation queue.",
    href: `${INTERNAL_PREFIX}/frontdesk/patients`,
    createdAt: "10:42 AM", isRead: true,
    targetDepartments: ["frontdesk", "doctors"],
  },
  {
    id: "N012", category: "doctor", severity: "info",
    title: "Lab Test Ordered",
    body: "Dr. Osei ordered Urinalysis for Ama Owusu (PT-8235) — sent to Lab.",
    href: `${INTERNAL_PREFIX}/lab/test-requests`,
    createdAt: "11:10 AM", isRead: true,
    targetDepartments: ["lab"],
  },
  {
    id: "N013", category: "nursing", severity: "info",
    title: "Shift Handover Submitted",
    body: "Morning to afternoon handover notes submitted by Nurse Grace.",
    href: `${INTERNAL_PREFIX}/nurses/handover-notes`,
    createdAt: "12:00 PM", isRead: true,
    targetDepartments: ["nurses"],
  },
  {
    id: "N014", category: "hr", severity: "info",
    title: "New Staff Onboarded",
    body: "Lab scientist Dr. Agyeman onboarding completed. IT access requested.",
    href: `${INTERNAL_PREFIX}/hr/onboarding`,
    createdAt: "12:15 PM", isRead: true,
    targetDepartments: ["hr", "it"],
  },
  {
    id: "N015", category: "store", severity: "info",
    title: "Stock Issued to Pharmacy",
    body: "500 units of Amoxicillin issued from Store to Pharmacy (PO-2024-0041).",
    href: `${INTERNAL_PREFIX}/store`,
    createdAt: "01:00 PM", isRead: true,
    targetDepartments: ["pharmacy", "store"],
  },
  {
    id: "N017", category: "doctor", severity: "info",
    title: "Consultation Queue Growing",
    body: "15 patients in consultation queue. 3 marked urgent by Front Desk.",
    href: `${INTERNAL_PREFIX}/doctors/queue`,
    createdAt: "01:15 PM", isRead: true,
    targetDepartments: ["doctors", "frontdesk"],
  },
  {
    id: "N018", category: "nursing", severity: "info",
    title: "Medication Administration Due",
    body: "Evening medication round starts at 18:00 — 7 inpatients on schedule.",
    href: `${INTERNAL_PREFIX}/nurses/medication-admin`,
    createdAt: "01:30 PM", isRead: true,
    targetDepartments: ["nurses"],
  },
  {
    id: "N019", category: "accounts", severity: "info",
    title: "Daily Revenue Target Approaching",
    body: "₦45,280 collected today. Daily target ₦50,000 — 90.6% achieved.",
    href: `${INTERNAL_PREFIX}/accounts`,
    createdAt: "02:00 PM", isRead: true,
    targetDepartments: ["accounts", "admin"],
  },
  {
    id: "N020", category: "it", severity: "info",
    title: "System Maintenance Scheduled",
    body: "Planned maintenance window: Sunday 02:00–04:00 AM. Brief downtime expected.",
    href: `${INTERNAL_PREFIX}/it`,
    createdAt: "02:30 PM", isRead: true,
    targetDepartments: "all",
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

// Bumped to v2 to flush old cache that lacked targetDepartments
const STORAGE_KEY = "hms-notifications-v2";

function loadState(): NotifState {
  if (typeof window === "undefined") return { notifications: SEED, toastedIds: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NotifState;
      // Migration: back-fill targetDepartments for any stored notifs missing it
      parsed.notifications = parsed.notifications.map((n) => ({
        ...n,
        targetDepartments: n.targetDepartments ?? ("all" as const),
      }));
      return parsed;
    }
  } catch {}
  return { notifications: SEED, toastedIds: [] };
}

function saveState(s: NotifState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

let _state: NotifState | null = null;
function getState(): NotifState {
  if (!_state) _state = loadState();
  return _state;
}

const storeListeners = new Set<() => void>();
function mutate(updater: (s: NotifState) => void) {
  const s = getState();
  updater(s);
  saveState(s);
  storeListeners.forEach((l) => l());
}

export function subscribeNotificationStore(fn: () => void) {
  storeListeners.add(fn);
  return () => { storeListeners.delete(fn); };
}

// ─── Supabase sync ────────────────────────────────────────────────────────────

let _synced = false;
export async function syncNotificationsFromSupabase() {
  if (typeof window === "undefined" || _synced) return;
  try {
    const { fetchNotifications } = await import("@/lib/supabase/db");
    const notifications = await fetchNotifications();
    if (notifications.length) {
      const current = getState();
      _state = { ...current, notifications };
      saveState(_state);
      storeListeners.forEach((l) => l());
      _synced = true;
    }
  } catch { /* keep localStorage/seed */ }
}

// ─── Toast listeners ─────────────────────────────────────────────────────────

type ToastListener = (notif: AppNotification) => void;
const toastListeners = new Set<ToastListener>();

export function onNewNotification(fn: ToastListener) {
  toastListeners.add(fn);
  return () => { toastListeners.delete(fn); };
}

// ─── Department filter helper ─────────────────────────────────────────────────

/** Returns true if `notif` should be visible to `dept` */
export function notifMatchesDept(notif: AppNotification, dept: string): boolean {
  if (dept === "admin") return true; // admin sees everything
  if (notif.targetDepartments === "all") return true;
  return notif.targetDepartments.includes(dept as DeptKey);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getNotifications(): AppNotification[] {
  return [...getState().notifications];
}

/** Returns only notifications targeted at a specific department */
export function getNotificationsForDept(dept: string): AppNotification[] {
  return getState().notifications.filter((n) => notifMatchesDept(n, dept));
}

export function getUnreadCount(): number {
  return getState().notifications.filter((n) => !n.isRead).length;
}

/** Unread count filtered to a specific department */
export function getUnreadCountForDept(dept: string): number {
  return getState().notifications.filter(
    (n) => !n.isRead && notifMatchesDept(n, dept),
  ).length;
}

export function markRead(id: string) {
  mutate((s) => {
    s.notifications = s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n);
  });
}

export function markAllRead() {
  mutate((s) => { s.notifications = s.notifications.map((n) => ({ ...n, isRead: true })); });
}

/** Mark all read for a specific department only */
export function markAllReadForDept(dept: string) {
  mutate((s) => {
    s.notifications = s.notifications.map((n) =>
      notifMatchesDept(n, dept) ? { ...n, isRead: true } : n,
    );
  });
}

export function getToastedIds(): string[] {
  return [...getState().toastedIds];
}

export function addToastedId(id: string) {
  mutate((s) => {
    if (!s.toastedIds.includes(id)) s.toastedIds = [...s.toastedIds, id];
  });
}

/** Push a new live notification — also fires toast listeners */
export function pushNotification(
  notif: Omit<AppNotification, "id" | "createdAt" | "isRead">,
): AppNotification {
  const full: AppNotification = {
    ...notif,
    id: `N-${Date.now()}`,
    createdAt: new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    isRead: false,
  };
  mutate((s) => { s.notifications = [full, ...s.notifications]; });
  toastListeners.forEach((fn) => fn(full));
  return full;
}

/** Reset store to seed (dev helper) */
export function resetNotifications() {
  _state = { notifications: SEED, toastedIds: [] };
  saveState(_state);
  storeListeners.forEach((l) => l());
}
