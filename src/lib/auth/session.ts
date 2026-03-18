import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  hmsSessionV2CookieName,
  hmsStaffPortalSessionCookieName,
  hmsPendingSessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import {
  departmentHomePaths,
  type DepartmentKey,
} from "@/lib/constants/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Canonical role keys — must match the role_key enum in the database.
 * Extend this list if new roles are added to the DB enum.
 */
export type RoleKey =
  | "admin"
  | "hod"
  | "hr_manager"
  | "hr_staff"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "pharmacy_assistant"
  | "lab_scientist"
  | "accountant"
  | "front_desk_staff"
  | "store_keeper"
  | "it_staff"
  | "viewer";

/**
 * Session payload stored in HMS session cookies and forwarded as
 * request headers by middleware so Server Components can read it cheaply.
 */
export type HMSSession = {
  staff_id: string;
  full_name: string;
  email: string;
  department: DepartmentKey;
  role: RoleKey;
  /** Flat permission strings e.g. "pharmacy:inventory:read" */
  permissions: string[];
  /** ISO timestamp of when the session was last refreshed */
  issued_at: string;
};

// ─── Serialisation ───────────────────────────────────────────────────────────

export function serialiseSession(session: HMSSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function deserialiseSession(raw: string): HMSSession | null {
  try {
    const json = Buffer.from(raw, "base64").toString("utf-8");
    return JSON.parse(json) as HMSSession;
  } catch {
    return null;
  }
}

// ─── Management Portal session (/app/*) ──────────────────────────────────────

/**
 * Read the management portal HMSSession from the hms-session-v2 cookie.
 */
export async function getServerSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Write the management portal session cookie after a successful login.
 */
export async function writeSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsSessionV2CookieName, serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Require a management portal session. Redirects to /login if absent.
 */
export async function requireSession(): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// ─── Staff Portal session (/staff/*) ─────────────────────────────────────────

/**
 * Read the staff portal HMSSession from the hms-staff-session cookie.
 * Kept separate from management portal so the two portals require
 * independent logins on the same device.
 */
export async function getStaffPortalSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsStaffPortalSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Write the staff portal session cookie after a successful staff portal login.
 */
export async function writeStaffPortalSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsStaffPortalSessionCookieName, serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Require a staff portal session. Redirects to /staff/login if absent.
 */
export async function requireStaffPortalSession(): Promise<HMSSession> {
  const session = await getStaffPortalSession();
  if (!session) {
    redirect("/staff/login");
  }
  return session;
}

// ─── Pending password-change session (/change-password) ──────────────────────

/**
 * Write a short-lived pending session cookie.
 * Set after login when must_change_password = true.
 * The user is held on /change-password; the real hms-session-v2 is only
 * written after they successfully set a new password.
 */
export async function writePendingSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsPendingSessionCookieName, serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15, // 15 minutes — enough time to change password
  });
}

export async function readPendingSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsPendingSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

export async function clearPendingSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(hmsPendingSessionCookieName);
}

// ─── Shared cookie clearing ───────────────────────────────────────────────────

/**
 * Clear management portal session cookies (v2 + legacy).
 */
export async function clearManagementSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(hmsSessionV2CookieName);
  store.delete(sessionCookieName);
  store.delete(sessionDepartmentCookieName);
  store.delete(sessionStaffNameCookieName);
}

/**
 * Clear staff portal session cookie.
 */
export async function clearStaffPortalSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(hmsStaffPortalSessionCookieName);
}

/**
 * Clear ALL session cookies (both portals + legacy).
 * Used when performing a full sign-out from Supabase.
 */
export async function clearSessionCookies(): Promise<void> {
  await clearManagementSessionCookies();
  await clearStaffPortalSessionCookies();
}

// ─── Legacy helpers (kept for backward compatibility) ────────────────────────

export const loginDepartmentOptions: Array<{
  value: DepartmentKey;
  label: string;
}> = [
  { value: "frontdesk", label: "Front Desk" },
  { value: "doctors", label: "Doctors" },
  { value: "nurses", label: "Nurses" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "lab", label: "Laboratory" },
  { value: "accounts", label: "Accounts" },
  { value: "store", label: "Store" },
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
];

export function isDepartmentKey(value: string): value is DepartmentKey {
  return value in departmentHomePaths;
}

export function getDepartmentHomePath(department: DepartmentKey) {
  return departmentHomePaths[department];
}

/**
 * Legacy getCurrentSession — reads from old mock cookies.
 * Falls back gracefully: checks mgmt v2 cookie first, then legacy cookies.
 */
export async function getCurrentSession() {
  const store = await cookies();

  // Try management portal v2 session first
  const v2Raw = store.get(hmsSessionV2CookieName)?.value;
  if (v2Raw) {
    const session = deserialiseSession(v2Raw);
    if (session) {
      return {
        hasSession: true,
        department: session.department,
        staffName: session.full_name,
        role: session.role,
        permissions: session.permissions,
      };
    }
  }

  // Fall back to legacy mock cookies
  const department = store.get(sessionDepartmentCookieName)?.value;
  const staffName = store.get(sessionStaffNameCookieName)?.value ?? "Staff User";

  return {
    hasSession: store.has(sessionCookieName),
    department: department && isDepartmentKey(department) ? department : null,
    staffName,
    role: null as RoleKey | null,
    permissions: [] as string[],
  };
}

export async function redirectToSessionHome() {
  const session = await getCurrentSession();

  if (session.hasSession && session.department) {
    redirect(getDepartmentHomePath(session.department));
  }
}
