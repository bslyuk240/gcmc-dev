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
  isProtectedPath,
  shouldAllowProtectedRequest,
} from "@/lib/auth/guards";
import { updateSession } from "@/lib/supabase/middleware";
import { securityHeaders } from "@/lib/security/headers";

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Step 1: Refresh Supabase auth token ──────────────────────────────────
  // updateSession() returns a new response with refreshed Supabase cookies.
  // It is a no-op when Supabase env vars are not configured.
  const supabaseResponse = await updateSession(request);

  // ── Step 2: Parse HMS session ─────────────────────────────────────────────
  const sessionDepartment = getSessionDepartment(request);
  const hmsSession        = getHMSSession(request);

  // ── Step 3: Redirect authenticated user away from /login ─────────────────
  if (pathname === "/login" && sessionDepartment && sessionDepartment in departmentHomePaths) {
    const response = NextResponse.redirect(
      new URL(
        departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
        request.url,
      ),
    );
    return applySecurityHeaders(response);
  }

  // ── Step 4: Guard protected paths ─────────────────────────────────────────
  if (isProtectedPath(pathname) && !shouldAllowProtectedRequest(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ── Step 5: Department isolation for /app/* ───────────────────────────────
  if (sessionDepartment && pathname.startsWith(`${INTERNAL_PREFIX}/`)) {
    const routeDepartment = getDepartmentFromPath(pathname);
    const isSharedRoute   = sharedProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

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
  // This avoids Server Components needing to re-parse the cookie themselves.
  const requestWithHeaders = supabaseResponse ?? NextResponse.next({ request });

  if (hmsSession) {
    requestWithHeaders.headers.set("x-hms-staff-id",    hmsSession.staff_id);
    requestWithHeaders.headers.set("x-hms-department",  hmsSession.department);
    requestWithHeaders.headers.set("x-hms-role",        hmsSession.role);
    requestWithHeaders.headers.set("x-hms-full-name",   hmsSession.full_name);
    requestWithHeaders.headers.set("x-hms-permissions", hmsSession.permissions.join(","));
  } else if (sessionDepartment) {
    // Legacy session — forward department only
    requestWithHeaders.headers.set("x-hms-department", sessionDepartment);
  }

  return applySecurityHeaders(requestWithHeaders);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
