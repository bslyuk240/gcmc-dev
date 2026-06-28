import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isDepartmentKey,
  clearManagementSessionCookies,
  writeStaffPortalSessionCookie,
} from "@/lib/auth/session";
import { resolveStaffProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginHospital } from "@/lib/tenant/login-tenant";
import {
  buildHMSSession,
  fetchRolePermissions,
  staffProfileEligibleForLogin,
} from "@/lib/auth/build-session";
import { checkLoginRateLimit, loginRateLimitKey } from "@/lib/security/rate-limit";
import {
  auditIpFromRequest,
  auditUserAgentFromRequest,
  logAuditEvent,
} from "@/lib/audit/log-event";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const StaffLoginSchema = z.object({
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
function isAllowedStaffNext(next: string): boolean {
  return next.startsWith("/staff/") && !next.includes("//");
}

function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

// ─── POST /api/auth/staff-login ───────────────────────────────────────────────
export async function POST(request: Request) {
  const wantsJson = request.headers.get("x-portal-login") === "1";

  const loginError = (code: string, status = 400) =>
    wantsJson
      ? NextResponse.json({ error: code }, { status })
      : NextResponse.redirect(new URL(`/staff/login?error=${code}`, request.url), 303);

  // ── Parse & validate with Zod ─────────────────────────────────────────────
  let email: string, password: string, nextUrl: string;
  try {
    const formData = await request.formData();
    const raw = {
      email:    formData.get("email"),
      password: formData.get("password"),
      next:     formData.get("next"),
    };
    const parsed = StaffLoginSchema.parse(raw);
    email    = parsed.email;
    password = parsed.password;
    nextUrl  = parsed.next;
  } catch {
    // Do NOT log the raw payload — it may contain the password field.
    return loginError("invalid");
  }

  // ── Rate limit (keyed on IP + email, not the password) ───────────────────
  const rate = checkLoginRateLimit(loginRateLimitKey(clientIp(request), email));
  if (!rate.allowed) {
    return loginError("rate-limit", 429);
  }

  const hospital = await resolveLoginHospital();
  if (!hospital) {
    return loginError("tenant");
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

  const profile = await resolveStaffProfile(
    supabase,
    userId,
    userEmail,
    "id, full_name, email, department, role, hospital_id, avatar_url, is_active",
  );

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

  await clearManagementSessionCookies();
  await writeStaffPortalSessionCookie(session);

  await logAuditEvent({
    action:     "auth.staff.login",
    portal:     "staff",
    actorId:    userId,
    actorName:  profile.full_name,
    hospitalId: hospital.id,
    department: profile.department,
    ipAddress:  auditIpFromRequest(request),
    userAgent:  auditUserAgentFromRequest(request),
    // Role and hospital slug only — never email, never password
    payload: { role: profile.role, hospital_slug: hospital.slug },
  });

  const destination = nextUrl && isAllowedStaffNext(nextUrl) ? nextUrl : "/staff/dashboard";
  return wantsJson
    ? NextResponse.json({ redirectTo: destination })
    : NextResponse.redirect(new URL(destination, request.url), 303);
}
