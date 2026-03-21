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
  | "kiosk"
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
  kiosk:        "🏪",
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

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: AppNotification[] = [];

// ─── Storage ──────────────────────────────────────────────────────────────────

// Bumped to v2 to flush old cache that lacked targetDepartments
const STORAGE_KEY = "hms-notifications-v2";
const EMPTY_STATE: NotifState = { notifications: [], toastedIds: [] };

function loadState(): NotifState {
  return EMPTY_STATE;
}

function saveState(s: NotifState) {
  void s;
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
    const current = getState();
    _state = { ...current, notifications };
    storeListeners.forEach((l) => l());
    _synced = true;
  } catch { /* keep empty Supabase-backed state */ }
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

/** Push a new live notification — also fires toast listeners and persists to Supabase */
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
  // Persist to Supabase (fire-and-forget — UI already updated)
  import("@/lib/supabase/db").then(({ insertNotification }) => {
    insertNotification(full).catch((e) => console.error("[notification-store] persist failed:", e));
  });
  return full;
}

/** Reset store to seed (dev helper) */
export function resetNotifications() {
  _state = { notifications: SEED, toastedIds: [] };
  saveState(_state);
  storeListeners.forEach((l) => l());
}
