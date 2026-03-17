import type { NextRequest } from "next/server";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  hmsSessionV2CookieName,
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
 * Parse the HMSSession from the v2 cookie if present.
 * Returns null when absent or malformed.
 */
export function getHMSSession(request: NextRequest) {
  const raw = request.cookies.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSession(raw);
}

/**
 * Derive the department from the request — checks v2 session first,
 * then falls back to the legacy hms-department cookie.
 */
export function getSessionDepartment(request: NextRequest): string | null {
  const session = getHMSSession(request);
  if (session) return session.department;
  return request.cookies.get(sessionDepartmentCookieName)?.value ?? null;
}

/**
 * True when the request carries any valid session (v2 or legacy mock).
 */
export function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(hmsSessionV2CookieName) ||
    request.cookies.has(sessionCookieName)
  );
}

export function shouldAllowProtectedRequest(request: NextRequest): boolean {
  return hasSessionCookie(request);
}
