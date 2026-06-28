import type { NextRequest, NextResponse } from "next/server";
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
import { deserialiseSessionPayload } from "@/lib/auth/session-payload";
import type { HMSSession } from "@/lib/auth/session-types";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { sessionMatchesTenant } from "@/lib/tenant/resolve";

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

export async function getHMSSession(request: NextRequest): Promise<HMSSession | null> {
  const raw = request.cookies.get(hmsSessionV2CookieName)?.value;
  if (!raw) return null;
  return deserialiseSessionPayload(raw);
}

export async function getStaffPortalHMSSession(request: NextRequest): Promise<HMSSession | null> {
  const raw = request.cookies.get(hmsStaffPortalSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSessionPayload(raw);
}

export async function getPendingHMSSession(request: NextRequest): Promise<HMSSession | null> {
  const raw = request.cookies.get(hmsPendingSessionCookieName)?.value;
  if (!raw) return null;
  return deserialiseSessionPayload(raw);
}

export async function getSessionDepartment(request: NextRequest): Promise<string | null> {
  const session = await getHMSSession(request);
  if (session) return session.department;
  return request.cookies.get(sessionDepartmentCookieName)?.value ?? null;
}

export async function hasManagementSession(request: NextRequest): Promise<boolean> {
  // Only the HMAC-signed hms-session-v2 cookie is accepted.
  // The legacy hms-session + hms-department pair has been removed — it carried
  // no hospital_id and bypassed tenant verification entirely.
  return (await getHMSSession(request)) !== null;
}

export async function hasStaffPortalSession(request: NextRequest): Promise<boolean> {
  return (await getStaffPortalHMSSession(request)) !== null;
}

export async function hasSessionCookie(request: NextRequest): Promise<boolean> {
  return (await hasManagementSession(request)) || (await hasStaffPortalSession(request));
}

export async function shouldAllowProtectedRequest(request: NextRequest): Promise<boolean> {
  return hasSessionCookie(request);
}

/** Clear HMS portal cookies (e.g. when returning to the platform console). */
export function clearPortalSessionsOnResponse(response: NextResponse): void {
  const opts = { path: "/", maxAge: 0 };
  response.cookies.set(hmsSessionV2CookieName, "", opts);
  response.cookies.set(hmsStaffPortalSessionCookieName, "", opts);
  response.cookies.set(hmsPendingSessionCookieName, "", opts);
  response.cookies.set(sessionCookieName, "", opts);
  response.cookies.set(sessionDepartmentCookieName, "", opts);
  response.cookies.set(sessionStaffNameCookieName, "", opts);
}

export function setTenantSlugCookie(response: NextResponse, tenantSlug: string): void {
  response.cookies.set(hmsTenantSlugCookieName, tenantSlug, {
    ...sessionCookieOptions,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function validateSessionTenant(
  session: HMSSession | null,
  tenantSlug: string,
): Promise<boolean> {
  if (!session) return true;
  return sessionMatchesTenant(session, tenantSlug);
}
