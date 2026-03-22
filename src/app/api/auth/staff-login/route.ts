import { NextResponse } from "next/server";
import {
  isDepartmentKey,
  writeStaffPortalSessionCookie,
  type HMSSession,
  type RoleKey,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function isAllowedStaffNext(next: string): boolean {
  return next.startsWith("/staff/") && !next.includes("//");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextUrl = String(formData.get("next") ?? "").trim();

  const loginError = (code: string) =>
    NextResponse.redirect(new URL(`/staff/login?error=${code}`, request.url));

  if (!email || !password) {
    return loginError("invalid");
  }

  const supabase = await createClient();
  if (!supabase) {
    return loginError("configuration");
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return loginError("credentials");
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("full_name, email, department, role, avatar_url, is_active")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return loginError("profile");
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return loginError("inactive");
  }

  if (!isDepartmentKey(profile.department)) {
    await supabase.auth.signOut();
    return loginError("invalid");
  }

  const { data: permRows } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", profile.role);

  const permissions = (permRows ?? []).map((r: { permission: string }) => r.permission);

  const session: HMSSession = {
    staff_id: userId,
    full_name: profile.full_name,
    email: profile.email,
    avatar_url: profile.avatar_url ?? null,
    department: profile.department,
    role: profile.role as RoleKey,
    permissions,
    issued_at: new Date().toISOString(),
  };

  await writeStaffPortalSessionCookie(session);

  const destination = nextUrl && isAllowedStaffNext(nextUrl) ? nextUrl : "/staff/dashboard";
  return NextResponse.redirect(new URL(destination, request.url));
}
