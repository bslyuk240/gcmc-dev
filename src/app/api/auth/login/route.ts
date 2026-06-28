import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  getDepartmentHomePath,
  isDepartmentKey,
  clearManagementSessionCookies,
  clearStaffPortalSessionCookies,
  writePendingSessionCookie,
  writeSessionCookie,
} from "@/lib/auth/session";
import { resolveStaffProfile } from "@/lib/auth/profile";
import {
  isPlatformAdminProfile,
  platformAdminProfileFromLegacy,
} from "@/lib/auth/platform-profile";
import { verifyPlatformAdmin } from "@/lib/platform/audit";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginHospital } from "@/lib/tenant/login-tenant";
import {
  buildHMSSession,
  fetchRolePermissions,
  staffProfileEligibleForLogin,
} from "@/lib/auth/build-session";
import { checkLoginRateLimit, loginRateLimitKey } from "@/lib/security/rate-limit";
import { logPlatformAudit } from "@/lib/platform/audit";
import {
  auditIpFromRequest,
  auditUserAgentFromRequest,
  logAuditEvent,
} from "@/lib/audit/log-event";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(254)
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128),
  next: z
    .string()
    .trim()
    .max(512)
    .optional()
    .default(""),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isAllowedNext(next: string): boolean {
  if (next.startsWith("/platform")) return !next.includes("//");
  if (!next.startsWith(INTERNAL_PREFIX)) return false;
  try {
    const u = new URL(next, "http://localhost");
    return u.pathname === next && !next.includes("//");
  } catch {
    return false;
  }
}

function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  const wantsJson = request.headers.get("x-portal-login") === "1";

  const loginError = (code: string, status = 400) =>
    wantsJson
      ? NextResponse.json({ error: code }, { status })
      : NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303);

  // ── Parse & validate with Zod ─────────────────────────────────────────────
  let email: string, password: string, nextUrl: string;
  try {
    const formData = await request.formData();
    const raw = {
      email:    formData.get("email"),
      password: formData.get("password"),
      next:     formData.get("next"),
    };
    const parsed = LoginSchema.parse(raw);
    email    = parsed.email;
    password = parsed.password;
    nextUrl  = parsed.next;
  } catch {
    // Do NOT log the raw payload — it may contain the password field.
    return loginError("invalid");
  }

  // ── Rate limit (keyed on IP + email hash, not the password) ──────────────
  const rate = checkLoginRateLimit(loginRateLimitKey(clientIp(request), email));
  if (!rate.allowed) {
    return loginError("rate-limit", 429);
  }

  const supabase = await createClient();
  if (!supabase) {
    return loginError("configuration");
  }

  // ── Supabase auth — password never logged beyond this point ──────────────
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Wipe the password variable immediately after use.
  password = "";

  if (authError || !authData.user) {
    return loginError("credentials");
  }

  const userId    = authData.user.id;
  const userEmail = authData.user.email ?? email;

  let profile = await resolveStaffProfile(supabase, userId, userEmail);

  if (!isPlatformAdminProfile(profile)) {
    const legacyPlatformAdmin = await verifyPlatformAdmin(userId);
    if (legacyPlatformAdmin) {
      profile = platformAdminProfileFromLegacy(legacyPlatformAdmin);
    }
  }

  if (isPlatformAdminProfile(profile)) {
    await clearManagementSessionCookies();
    await clearStaffPortalSessionCookies();

    await logPlatformAudit({
      action:     "login",
      actorId:    profile.id,
      actorName:  profile.full_name,
      ipAddress:  clientIp(request),
      userAgent:  auditUserAgentFromRequest(request),
      // Only non-sensitive metadata — never email, never password
      payload: { role: profile.role, portal: "platform" },
    });

    const destination =
      nextUrl && isAllowedNext(nextUrl) && nextUrl.startsWith("/platform")
        ? nextUrl
        : "/platform/dashboard";

    return wantsJson
      ? NextResponse.json({ redirectTo: destination })
      : NextResponse.redirect(new URL(destination, request.url), 303);
  }

  const hospital = await resolveLoginHospital();
  if (!hospital) {
    await supabase.auth.signOut();
    return loginError("tenant");
  }

  if (!staffProfileEligibleForLogin(profile, hospital)) {
    await supabase.auth.signOut();
    return loginError("credentials");
  }

  if (!isDepartmentKey(profile.department)) {
    await supabase.auth.signOut();
    return loginError("invalid");
  }

  const permissions = await fetchRolePermissions(supabase, profile.role);
  const session     = buildHMSSession(profile, hospital, permissions, userId);

  if (profile.must_change_password) {
    await clearStaffPortalSessionCookies();
    await writePendingSessionCookie(session);
    return wantsJson
      ? NextResponse.json({ redirectTo: "/change-password" })
      : NextResponse.redirect(new URL("/change-password", request.url), 303);
  }

  await clearStaffPortalSessionCookies();
  await writeSessionCookie(session);

  await logAuditEvent({
    action:     "auth.management.login",
    portal:     "management",
    actorId:    userId,
    actorName:  profile.full_name,
    hospitalId: hospital.id,
    department: profile.department,
    ipAddress:  auditIpFromRequest(request),
    userAgent:  auditUserAgentFromRequest(request),
    // Role and hospital slug are non-sensitive metadata
    payload: { role: profile.role, hospital_slug: hospital.slug },
  });

  const store = await cookies();
  const opts  = { ...sessionCookieOptions, secure: process.env.NODE_ENV === "production" };
  store.set(sessionCookieName,          "authenticated",    opts);
  store.set(sessionDepartmentCookieName, profile.department, opts);
  store.set(sessionStaffNameCookieName,  profile.full_name,  opts);

  const redirectUrl =
    nextUrl && isAllowedNext(nextUrl)
      ? nextUrl
      : getDepartmentHomePath(profile.department);

  return wantsJson
    ? NextResponse.json({ redirectTo: redirectUrl })
    : NextResponse.redirect(new URL(redirectUrl, request.url), 303);
}
