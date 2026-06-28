import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  hmsSessionV2CookieName,
  hmsStaffPortalSessionCookieName,
  hmsPendingSessionCookieName,
  hmsTenantSlugCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import {
  deserialiseSessionPayload,
  serialiseSessionPayload,
} from "@/lib/auth/session-payload";
import {
  departmentHomePaths,
  type DepartmentKey,
} from "@/lib/constants/navigation";

export type { HMSSession, RoleKey } from "@/lib/auth/session-types";

import type { HMSSession, RoleKey } from "@/lib/auth/session-types";

// ─── Serialisation (HMAC-signed) ─────────────────────────────────────────────

export async function serialiseSession(session: HMSSession): Promise<string> {
  return serialiseSessionPayload(session);
}

export async function deserialiseSession(raw: string): Promise<HMSSession | null> {
  return deserialiseSessionPayload(raw);
}

// ─── Management Portal session (/app/*) ──────────────────────────────────────

export async function getServerSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

export async function writeSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsSessionV2CookieName, await serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function requireSession(): Promise<HMSSession> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// ─── Staff Portal session (/staff/*) ─────────────────────────────────────────

export async function getStaffPortalSession(): Promise<HMSSession | null> {
  const store = await cookies();
  const raw = store.get(hmsStaffPortalSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

export async function writeStaffPortalSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsStaffPortalSessionCookieName, await serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function syncStaffAvatarAcrossSessions(staffId: string, avatarUrl: string): Promise<void> {
  const store = await cookies();
  const cookieNames = [hmsSessionV2CookieName, hmsStaffPortalSessionCookieName];

  for (const cookieName of cookieNames) {
    const raw = store.get(cookieName)?.value;
    if (!raw) continue;

    const session = await deserialiseSession(raw);
    if (!session || session.staff_id !== staffId) continue;

    store.set(
      cookieName,
      await serialiseSession({
        ...session,
        avatar_url: avatarUrl,
      }),
      {
        ...sessionCookieOptions,
        secure: process.env.NODE_ENV === "production",
      },
    );
  }
}

export async function requireStaffPortalSession(): Promise<HMSSession> {
  const session = await getStaffPortalSession();
  if (!session) {
    redirect("/staff/login");
  }
  return session;
}

// ─── Pending password-change session (/change-password) ──────────────────────

export async function writePendingSessionCookie(session: HMSSession): Promise<void> {
  const store = await cookies();
  store.set(hmsPendingSessionCookieName, await serialiseSession(session), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 15,
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

export async function clearManagementSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(hmsSessionV2CookieName);
  store.delete(sessionCookieName);
  store.delete(sessionDepartmentCookieName);
  store.delete(sessionStaffNameCookieName);
}

export async function clearStaffPortalSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(hmsStaffPortalSessionCookieName);
}

export async function clearSessionCookies(): Promise<void> {
  await clearManagementSessionCookies();
  await clearStaffPortalSessionCookies();
}

export async function writeTenantSlugCookie(slug: string): Promise<void> {
  const store = await cookies();
  store.set(hmsTenantSlugCookieName, slug.trim().toLowerCase(), {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

// ─── Legacy helpers ──────────────────────────────────────────────────────────

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
  { value: "non_clinical", label: "Non-Clinical Staff" },
];

export function isDepartmentKey(value: string): value is DepartmentKey {
  return value in departmentHomePaths;
}

export function getDepartmentHomePath(department: DepartmentKey) {
  return departmentHomePaths[department];
}

export async function getCurrentSession() {
  const store = await cookies();

  const v2Raw = store.get(hmsSessionV2CookieName)?.value;
  if (v2Raw) {
    const session = await deserialiseSession(v2Raw);
    if (session) {
      return {
        hasSession: true,
        department: session.department,
        staffName: session.full_name,
        role: session.role,
        permissions: session.permissions,
        hospitalId: session.hospital_id,
        hospitalSlug: session.hospital_slug,
      };
    }
  }

  const department = store.get(sessionDepartmentCookieName)?.value;
  const staffName = store.get(sessionStaffNameCookieName)?.value ?? "Staff User";

  return {
    hasSession: store.has(sessionCookieName),
    department: department && isDepartmentKey(department) ? department : null,
    staffName,
    role: null as RoleKey | null,
    permissions: [] as string[],
    hospitalId: null as string | null,
    hospitalSlug: null as string | null,
  };
}

export async function redirectToSessionHome() {
  const session = await getCurrentSession();

  if (session.hasSession && session.department) {
    redirect(getDepartmentHomePath(session.department));
  }
}
