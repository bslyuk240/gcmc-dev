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
  getPendingHMSSession,
  hasManagementSession,
  hasStaffPortalSession,
  clearPortalSessionsOnResponse,
  setTenantSlugCookie,
  validateSessionTenant,
} from "@/lib/auth/guards";
import { updateSession } from "@/lib/supabase/middleware";
import { securityHeaders } from "@/lib/security/headers";
import { hmsPendingSessionCookieName } from "@/lib/auth/constants";
import { resolveTenantSlug, resolveTenantSlugFromHost, sessionMatchesTenant } from "@/lib/tenant/resolve";
import { isTenantSessionAllowed } from "@/lib/tenant/hospital-access";

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

function redirectWithTenantCookie(url: URL, tenantSlug: string): NextResponse {
  const response = NextResponse.redirect(url);
  setTenantSlugCookie(response, tenantSlug);
  return applySecurityHeaders(response);
}

function nextWithTenantHeaders(
  base: NextResponse,
  tenantSlug: string,
  session: {
    staff_id: string;
    department: string;
    role: string;
    full_name: string;
    permissions: string[];
    hospital_id: string;
    hospital_slug: string;
  } | null,
  sessionDepartment: string | null,
): NextResponse {
  setTenantSlugCookie(base, tenantSlug);
  base.headers.set("x-hms-hospital-slug", tenantSlug);
  if (session) {
    base.headers.set("x-hms-hospital-id", session.hospital_id);
    base.headers.set("x-hms-staff-id", session.staff_id);
    base.headers.set("x-hms-department", session.department);
    base.headers.set("x-hms-role", session.role);
    base.headers.set("x-hms-full-name", session.full_name);
    base.headers.set("x-hms-permissions", session.permissions.join(","));
  } else if (sessionDepartment) {
    base.headers.set("x-hms-department", sessionDepartment);
  }
  return applySecurityHeaders(base);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tenantSlug = resolveTenantSlug(request);
  const supabaseResponse = await updateSession(request);

  // ── Hospital-signup must only work on the root/platform domain ───────────
  // Redirect gcmc.skolahq.com/hospital-signup → skolahq.com/hospital-signup
  if (pathname.startsWith("/hospital-signup")) {
    const host = request.headers.get("host") ?? "";
    const isOnTenantSubdomain = resolveTenantSlugFromHost(host) !== null;
    if (isOnTenantSubdomain) {
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
      const rootUrl = appDomain
        ? new URL(pathname, `https://${appDomain}`)
        : new URL(pathname, request.url);
      return NextResponse.redirect(rootUrl);
    }
  }

  // Platform console — auth enforced in (platform)/layout via Supabase session + role
  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    if (pathname === "/platform") {
      const response = NextResponse.redirect(new URL("/platform/dashboard", request.url));
      clearPortalSessionsOnResponse(response);
      return applySecurityHeaders(response);
    }
    const response = supabaseResponse ?? NextResponse.next();
    clearPortalSessionsOnResponse(response);
    return applySecurityHeaders(response);
  }

  // Root / platform domain (no subdomain resolved) — pass through without tenant processing.
  // The public layout and login page already handle the null-tenant case by showing
  // platform branding. No HMS session cookies apply here.
  if (tenantSlug === null) {
    return applySecurityHeaders(supabaseResponse ?? NextResponse.next());
  }

  const mgmtSession = await getHMSSession(request);
  const staffSession = await getStaffPortalHMSSession(request);
  const pendingSession = await getPendingHMSSession(request);
  const sessionDepartment = await getSessionDepartment(request);

  // Tenant mismatch — force re-login (prevents cross-tenant cookie tampering)
  const mgmtTenantOk = await validateSessionTenant(mgmtSession, tenantSlug);
  const staffTenantOk = await validateSessionTenant(staffSession, tenantSlug);
  const pendingTenantOk = pendingSession ? sessionMatchesTenant(pendingSession, tenantSlug) : true;

  if (!mgmtTenantOk || !staffTenantOk || !pendingTenantOk) {
    const loginPath = pathname.startsWith("/staff/") ? "/staff/login" : "/login";
    const response = redirectWithTenantCookie(
      new URL(`${loginPath}?error=tenant`, request.url),
      tenantSlug,
    );
    clearPortalSessionsOnResponse(response);
    return response;
  }

  // Suspended tenant or revoked sessions — force re-login
  if (mgmtSession && !(await isTenantSessionAllowed(mgmtSession))) {
    const response = redirectWithTenantCookie(
      new URL("/login?error=suspended", request.url),
      tenantSlug,
    );
    clearPortalSessionsOnResponse(response);
    return response;
  }

  if (staffSession && !(await isTenantSessionAllowed(staffSession))) {
    const response = redirectWithTenantCookie(
      new URL("/staff/login?error=suspended", request.url),
      tenantSlug,
    );
    clearPortalSessionsOnResponse(response);
    return response;
  }

  if (pendingSession && !(await isTenantSessionAllowed(pendingSession))) {
    const response = redirectWithTenantCookie(
      new URL("/login?error=suspended", request.url),
      tenantSlug,
    );
    clearPortalSessionsOnResponse(response);
    return response;
  }

  const hasPendingSession = request.cookies.has(hmsPendingSessionCookieName);

  if (hasPendingSession && pathname !== "/change-password") {
    return redirectWithTenantCookie(new URL("/change-password", request.url), tenantSlug);
  }

  if (pathname === "/change-password" && !hasPendingSession) {
    if ((await hasManagementSession(request)) && sessionDepartment && sessionDepartment in departmentHomePaths) {
      return redirectWithTenantCookie(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
        tenantSlug,
      );
    }
    return redirectWithTenantCookie(new URL("/login", request.url), tenantSlug);
  }

  if (pathname === "/login" && (await hasManagementSession(request)) && sessionDepartment) {
    if (sessionDepartment in departmentHomePaths) {
      return redirectWithTenantCookie(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
        tenantSlug,
      );
    }
  }

  if (pathname === "/staff/login" && (await hasStaffPortalSession(request))) {
    return redirectWithTenantCookie(new URL("/staff/dashboard", request.url), tenantSlug);
  }

  if (
    (pathname === INTERNAL_PREFIX || pathname.startsWith(`${INTERNAL_PREFIX}/`)) &&
    !(await hasManagementSession(request))
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithTenantCookie(loginUrl, tenantSlug);
  }

  if (
    pathname !== "/staff/login" &&
    (pathname === "/staff" || pathname.startsWith("/staff/")) &&
    !(await hasStaffPortalSession(request))
  ) {
    const loginUrl = new URL("/staff/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return redirectWithTenantCookie(loginUrl, tenantSlug);
  }

  if (sessionDepartment && pathname.startsWith(`${INTERNAL_PREFIX}/`)) {
    const routeDepartment = getDepartmentFromPath(pathname);
    const isSharedRoute = sharedProtectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (
      pathname === `${INTERNAL_PREFIX}/dashboard` &&
      routeDepartment === "dashboard" &&
      sessionDepartment !== "dashboard"
    ) {
      return redirectWithTenantCookie(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
        tenantSlug,
      );
    }

    if (
      !isSharedRoute &&
      routeDepartment !== "dashboard" &&
      routeDepartment !== sessionDepartment
    ) {
      return redirectWithTenantCookie(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
        tenantSlug,
      );
    }

    if (
      pathname === `${INTERNAL_PREFIX}` ||
      pathname === `${INTERNAL_PREFIX}/` ||
      pathname === `${INTERNAL_PREFIX}/dashboard`
    ) {
      return redirectWithTenantCookie(
        new URL(
          departmentHomePaths[sessionDepartment as keyof typeof departmentHomePaths],
          request.url,
        ),
        tenantSlug,
      );
    }
  }

  const requestWithHeaders = supabaseResponse ?? NextResponse.next({ request });
  const activeSession = pathname.startsWith("/staff/") ? staffSession : mgmtSession;

  return nextWithTenantHeaders(
    requestWithHeaders,
    tenantSlug,
    activeSession,
    sessionDepartment,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
