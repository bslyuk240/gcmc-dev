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
  clearStaffPortalSessionCookies,
  getDepartmentHomePath,
  writeSessionCookie,
  writePendingSessionCookie,
} from "@/lib/auth/session";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginHospital } from "@/lib/tenant/login-tenant";
import {
  buildHMSSession,
  fetchRolePermissions,
  staffProfileEligibleForLogin,
} from "@/lib/auth/build-session";

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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextUrl = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  const hospital = await resolveLoginHospital();
  if (!hospital) {
    redirect("/login?error=tenant");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/login?error=configuration");
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    redirect("/login?error=credentials");
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("id, full_name, email, department, role, hospital_id, is_active, must_change_password")
    .eq("id", userId)
    .single();

  if (profileError || !staffProfileEligibleForLogin(profile, hospital)) {
    await supabase.auth.signOut();
    redirect("/login?error=credentials");
  }

  const permissions = await fetchRolePermissions(supabase, profile.role);
  const session = buildHMSSession(profile, hospital, permissions, userId);

  if (profile.must_change_password) {
    await clearStaffPortalSessionCookies();
    await writePendingSessionCookie(session);
    redirect("/change-password");
  }

  await clearStaffPortalSessionCookies();
  await writeSessionCookie(session);

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
