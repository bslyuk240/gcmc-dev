import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getDepartmentFromPath,
  departmentHomePaths,
  sharedProtectedPrefixes,
  INTERNAL_PREFIX,
} from "@/lib/constants/navigation";
import {
  getSessionDepartment,
  getHMSSession,
  getStaffPortalHMSSession,
  hasManagementSession,
  hasStaffPortalSession,
} from "@/lib/auth/guards";
import { updateSession } from "@/lib/supabase/middleware";
import { securityHeaders } from "@/lib/security/headers";
import { hmsPendingSessionCookieName } from "@/lib/auth/constants";

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Step 1: Refresh Supabase auth token ──────────────────────────────────
  const supabaseResponse = await updateSession(request);

  // ── Step 2: Parse HMS sessions (one per portal) ───────────────────────────
  const mgmtSession       = getHMSSession(request);
  const staffSession      = getStaffPortalHMSSession(request);
  const sessionDepartment = getSessionDepartment(request);

  // ── Step 3: Handle first-login forced password change ────────────────────
  const hasPendingSession = request.cookies.has(hmsPendingSessionCookieName);

  if (hasPendingSession && pathname !== "/change-password") {
    // User must set a new password before doing anything else
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/change-password", request.url)),
    );
  }

  if (pathname === "/change-password" && !hasPendingSession) {
    // No pending session — either already changed or came here directly
    if (hasManagementSession(request) && sessionDepartment && sessionDepartment in departmentHomePaths) {
      return applySecurityHeaders(
        NextResponse.redirect(
          new URL(departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths], request.url),
        ),
      );
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }

  // If on /change-password with a valid pending session → fall through and serve the page

  // ── Step 3a: Redirect authenticated management users away from /login ─────
  if (pathname === "/login" && hasManagementSession(request) && sessionDepartment) {
    if (sessionDepartment in departmentHomePaths) {
      const response = NextResponse.redirect(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
      );
      return applySecurityHeaders(response);
    }
  }

  // ── Step 3b: Redirect authenticated staff users away from /staff/login ────
  // Having a management session does NOT redirect here — portals are independent.
  if (pathname === "/staff/login" && hasStaffPortalSession(request)) {
    const response = NextResponse.redirect(
      new URL("/staff/dashboard", request.url),
    );
    return applySecurityHeaders(response);
  }

  // ── Step 4: Guard protected paths — portal-specific ────────────────────────
  // /app/* requires the management portal session (hms-session-v2)
  if (
    (pathname === INTERNAL_PREFIX || pathname.startsWith(`${INTERNAL_PREFIX}/`)) &&
    !hasManagementSession(request)
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // /staff/* (except /staff/login) requires the staff portal session (hms-staff-session).
  // Being logged into /app/* does NOT grant access here.
  if (
    pathname !== "/staff/login" &&
    (pathname === "/staff" || pathname.startsWith("/staff/")) &&
    !hasStaffPortalSession(request)
  ) {
    const loginUrl = new URL("/staff/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ── Step 5: Department isolation for /app/* ───────────────────────────────
  if (sessionDepartment && pathname.startsWith(`${INTERNAL_PREFIX}/`)) {
    const routeDepartment = getDepartmentFromPath(pathname);
    const isSharedRoute   = sharedProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (
      pathname === `${INTERNAL_PREFIX}/dashboard` &&
      routeDepartment === "dashboard" &&
      sessionDepartment !== "dashboard"
    ) {
      const response = NextResponse.redirect(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
      );
      return applySecurityHeaders(response);
    }

    // Redirect user to their own department if they try to access another
    if (
      !isSharedRoute &&
      routeDepartment !== "dashboard" &&
      routeDepartment !== sessionDepartment
    ) {
      const response = NextResponse.redirect(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
      );
      return applySecurityHeaders(response);
    }

    // Redirect /app and /app/dashboard to the user's department home
    if (
      pathname === `${INTERNAL_PREFIX}` ||
      pathname === `${INTERNAL_PREFIX}/` ||
      pathname === `${INTERNAL_PREFIX}/dashboard`
    ) {
      const response = NextResponse.redirect(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
      );
      return applySecurityHeaders(response);
    }
  }

  // ── Step 6: Forward session fields as headers for Server Components ────────
  const requestWithHeaders = supabaseResponse ?? NextResponse.next({ request });

  // Use the portal-appropriate session for the request headers
  const activeSession = pathname.startsWith("/staff/") ? staffSession : mgmtSession;

  if (activeSession) {
    requestWithHeaders.headers.set("x-hms-staff-id",    activeSession.staff_id);
    requestWithHeaders.headers.set("x-hms-department",  activeSession.department);
    requestWithHeaders.headers.set("x-hms-role",        activeSession.role);
    requestWithHeaders.headers.set("x-hms-full-name",   activeSession.full_name);
    requestWithHeaders.headers.set("x-hms-permissions", activeSession.permissions.join(","));
  } else if (sessionDepartment) {
    requestWithHeaders.headers.set("x-hms-department", sessionDepartment);
  }

  return applySecurityHeaders(requestWithHeaders);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
