"use server";

import { redirect } from "next/navigation";
import {
  clearManagementSessionCookies,
  writeStaffPortalSessionCookie,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { resolveLoginHospital } from "@/lib/tenant/login-tenant";
import {
  buildHMSSession,
  fetchRolePermissions,
  staffProfileEligibleForLogin,
} from "@/lib/auth/build-session";

const STAFF_PORTAL_HOME = "/staff/dashboard";

function isAllowedStaffNext(next: string): boolean {
  return next.startsWith("/staff/") && !next.includes("//");
}

export async function loginStaffPortalAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextUrl = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirect("/staff/login?error=invalid");
  }

  const hospital = await resolveLoginHospital();
  if (!hospital) {
    redirect("/staff/login?error=tenant");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/staff/login?error=configuration");
  }

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
    .select("id, full_name, email, department, role, hospital_id, is_active")
    .eq("id", userId)
    .single();

  if (profileError || !staffProfileEligibleForLogin(profile, hospital)) {
    await supabase.auth.signOut();
    redirect("/staff/login?error=credentials");
  }

  const permissions = await fetchRolePermissions(supabase, profile.role);
  const session = buildHMSSession(profile, hospital, permissions, userId);

  await clearManagementSessionCookies();
  await writeStaffPortalSessionCookie(session);

  redirect(isAllowedStaffNext(nextUrl) ? nextUrl : STAFF_PORTAL_HOME);
}
