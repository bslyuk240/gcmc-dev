import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  hmsSessionV2CookieName,
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
 * Session payload stored in `hms-session-v2` cookie and forwarded as
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

// ─── Server-side session helpers (Server Components + Server Actions) ────────

/**
 * Read the production HMSSession from the v2 cookie.
 * Returns null when:
 *   - Supabase is not yet wired (cookie absent)
 *   - Cookie is malformed
 */
export async function getServerSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Write the HMSSession cookie after a successful Supabase login.
 */
export async function writeSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsSessionV2CookieName, serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Clear all session cookies (v1 legacy + v2) on logout.
 */
export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(hmsSessionV2CookieName);
  store.delete(sessionCookieName);
  store.delete(sessionDepartmentCookieName);
  store.delete(sessionStaffNameCookieName);
}

/**
 * Require an authenticated session in a Server Component / Server Action.
 * Redirects to /login if not authenticated.
 */
export async function requireSession(): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
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
 * Used by existing components until they migrate to getServerSession().
 * Falls back gracefully: checks v2 cookie first, then legacy cookies.
 */
export async function getCurrentSession() {
  const store = await cookies();

  // Try new v2 session first
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
