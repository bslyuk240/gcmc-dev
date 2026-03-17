"use server";

/**
 * Staff Portal login action.
 *
 * Uses the exact same credentials and auth logic as the main department
 * login (loginStaffAction), but after a successful login always redirects
 * to the Staff Self-Service Portal (/staff/dashboard) instead of the
 * departmental workflow portal (/app/<department>).
 *
 * The "next" parameter, if present, must start with "/staff" — any other
 * value is silently ignored to prevent open-redirect attacks.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import {
  isDepartmentKey,
  writeSessionCookie,
  type HMSSession,
  type RoleKey,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STAFF_PORTAL_HOME = "/staff/dashboard";

/** Only allow redirects within the staff portal. */
function isAllowedStaffNext(next: string): boolean {
  return next.startsWith("/staff/") && !next.includes("//");
}

export async function loginStaffPortalAction(formData: FormData) {
  const email   = String(formData.get("email")    ?? "").trim();
  const password= String(formData.get("password") ?? "").trim();
  const nextUrl = String(formData.get("next")     ?? "").trim();

  if (!email || !password) {
    redirect("/staff/login?error=invalid");
  }

  const supabase = await createClient();

  // ── Supabase path (real auth, when env vars are configured) ────────────────
  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      redirect("/staff/login?error=credentials");
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("full_name, email, department, role, is_active")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      redirect("/staff/login?error=profile");
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      redirect("/staff/login?error=inactive");
    }

    if (!isDepartmentKey(profile.department)) {
      await supabase.auth.signOut();
      redirect("/staff/login?error=invalid");
    }

    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role", profile.role);

    const permissions = (permRows ?? []).map((r: { permission: string }) => r.permission);

    const session: HMSSession = {
      staff_id:    userId,
      full_name:   profile.full_name,
      email:       profile.email,
      department:  profile.department,
      role:        profile.role as RoleKey,
      permissions,
      issued_at:   new Date().toISOString(),
    };

    await writeSessionCookie(session);

    // Also write legacy cookies so the rest of the app stays consistent
    const store = await cookies();
    const opts = { ...sessionCookieOptions, secure: process.env.NODE_ENV === "production" };
    store.set(sessionCookieName, "authenticated", opts);
    store.set(sessionDepartmentCookieName, profile.department, opts);
    store.set(sessionStaffNameCookieName, profile.full_name, opts);

    redirect(isAllowedStaffNext(nextUrl) ? nextUrl : STAFF_PORTAL_HOME);
  }

  // ── Demo / development fallback (no Supabase env vars) ────────────────────
  const store = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  // Derive department from email prefix: e.g. pharmacy.user@gcmc.local → pharmacy
  const emailPrefix    = email.split("@")[0].split(".")[0].toLowerCase();
  const demoDept       = isDepartmentKey(emailPrefix) ? emailPrefix : "frontdesk";
  const demoName       = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  store.set(sessionCookieName, "demo-session", opts);
  store.set(sessionDepartmentCookieName, demoDept, opts);
  store.set(sessionStaffNameCookieName, demoName, opts);

  redirect(isAllowedStaffNext(nextUrl) ? nextUrl : STAFF_PORTAL_HOME);
}
