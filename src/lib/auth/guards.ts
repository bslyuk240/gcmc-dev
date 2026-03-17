import type { NextRequest } from "next/server";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  hmsSessionV2CookieName,
  hmsStaffPortalSessionCookieName,
} from "@/lib/auth/constants";
import { deserialiseSession } from "@/lib/auth/session";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Public staff portal paths that must NOT require authentication */
const PUBLIC_STAFF_PATHS = ["/staff/login"];

/** Paths that require authentication */
export function isProtectedPath(pathname: string) {
  if (PUBLIC_STAFF_PATHS.includes(pathname)) return false;
  return (
    pathname === INTERNAL_PREFIX ||
    pathname.startsWith(`${INTERNAL_PREFIX}/`) ||
    pathname === "/staff" ||
    pathname.startsWith("/staff/")
  );
}

/**
 * Parse the management portal HMSSession from hms-session-v2 cookie.
 */
export function getHMSSession(request: NextRequest) {
  const raw = request.cookies.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Parse the staff portal HMSSession from hms-staff-session cookie.
 */
export function getStaffPortalHMSSession(request: NextRequest) {
  const raw = request.cookies.get(hmsStaffPortalSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Derive the department from the request for management portal.
 * Checks hms-session-v2 first, then falls back to legacy hms-department cookie.
 */
export function getSessionDepartment(request: NextRequest): string | null {
  const session = getHMSSession(request);
  if (session) return session.department;
  return request.cookies.get(sessionDepartmentCookieName)?.value ?? null;
}

/**
 * True when the request carries a valid management portal session.
 */
export function hasManagementSession(request: NextRequest): boolean {
  return (
    request.cookies.has(hmsSessionV2CookieName) ||
    request.cookies.has(sessionCookieName)
  );
}

/**
 * True when the request carries a valid staff portal session.
 */
export function hasStaffPortalSession(request: NextRequest): boolean {
  return request.cookies.has(hmsStaffPortalSessionCookieName);
}

/**
 * True when the request carries any valid session (either portal or legacy mock).
 * @deprecated Use hasManagementSession or hasStaffPortalSession for portal-specific checks.
 */
export function hasSessionCookie(request: NextRequest): boolean {
  return hasManagementSession(request) || hasStaffPortalSession(request);
}

export function shouldAllowProtectedRequest(request: NextRequest): boolean {
  return hasSessionCookie(request);
}
