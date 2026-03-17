"use server";

/**
 * Staff Portal login action.
 *
 * Same credentials as the management portal but writes to the SEPARATE
 * hms-staff-session cookie (not hms-session-v2). This ensures that
 * logging into one portal does not grant access to the other.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  hmsStaffPortalSessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import {
  isDepartmentKey,
  writeStaffPortalSessionCookie,
  serialiseSession,
  type HMSSession,
  type RoleKey,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STAFF_PORTAL_HOME = "/staff/dashboard";

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

    // Write ONLY the staff portal cookie — management portal cookie is untouched
    await writeStaffPortalSessionCookie(session);

    redirect(isAllowedStaffNext(nextUrl) ? nextUrl : STAFF_PORTAL_HOME);
  }

  // ── Demo / development fallback ────────────────────────────────────────────
  const store = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionCookieOptions.maxAge,
  };

  const emailPrefix = email.split("@")[0].split(".")[0].toLowerCase();
  const demoDept    = isDepartmentKey(emailPrefix) ? emailPrefix : "frontdesk";
  const demoName    = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const demoSession: HMSSession = {
    staff_id:    `demo-${demoDept}`,
    full_name:   demoName,
    email,
    department:  demoDept,
    role:        "front_desk_staff" as RoleKey,
    permissions: [],
    issued_at:   new Date().toISOString(),
  };
  store.set(hmsStaffPortalSessionCookieName, serialiseSession(demoSession), opts);

  redirect(isAllowedStaffNext(nextUrl) ? nextUrl : STAFF_PORTAL_HOME);
}
