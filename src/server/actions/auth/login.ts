"use server";

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
  getDepartmentHomePath,
  writeSessionCookie,
  writePendingSessionCookie,
  type HMSSession,
  type RoleKey,
} from "@/lib/auth/session";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/server";

/** Allow redirect only to internal paths. */
function isAllowedNext(next: string): boolean {
  if (!next.startsWith(INTERNAL_PREFIX)) return false;
  try {
    const u = new URL(next, "http://localhost");
    return u.pathname === next && !next.includes("//");
  } catch {
    return false;
  }
}

export async function loginStaffAction(formData: FormData) {
  const email    = String(formData.get("email")    ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextUrl  = String(formData.get("next")     ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  const supabase = await createClient();

  // ── Supabase path (when env vars are configured) ─────────────────────────
  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      redirect("/login?error=credentials");
    }

    const userId = authData.user.id;

    // Fetch staff profile
    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("full_name, email, department, role, is_active, must_change_password")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      redirect("/login?error=profile");
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      redirect("/login?error=inactive");
    }

    if (!isDepartmentKey(profile.department)) {
      await supabase.auth.signOut();
      redirect("/login?error=invalid");
    }

    // Fetch permissions for this role
    const { data: permRows } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role", profile.role);

    const permissions = (permRows ?? []).map((r: { permission: string }) => r.permission);

    // Build and write the HMS session
    const session: HMSSession = {
      staff_id:    userId,
      full_name:   profile.full_name,
      email:       profile.email,
      department:  profile.department,
      role:        profile.role as RoleKey,
      permissions,
      issued_at:   new Date().toISOString(),
    };

    // If the user must change their password on first login, hold them on
    // /change-password with a short-lived pending session cookie.
    // The real hms-session-v2 is only written after they set a new password.
    if (profile.must_change_password) {
      await writePendingSessionCookie(session);
      redirect("/change-password");
    }

    await writeSessionCookie(session);

    // Also write legacy cookies so existing components keep working
    const store = await cookies();
    const opts = { ...sessionCookieOptions, secure: process.env.NODE_ENV === "production" };
    store.set(sessionCookieName, "authenticated", opts);
    store.set(sessionDepartmentCookieName, profile.department, opts);
    store.set(sessionStaffNameCookieName, profile.full_name, opts);

    if (nextUrl && isAllowedNext(nextUrl)) {
      redirect(nextUrl);
    }
    redirect(getDepartmentHomePath(profile.department));
  }

  // Supabase is not configured — reject login
  redirect("/login?error=configuration");
}
