import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getDepartmentHomePath,
  isDepartmentKey,
  clearStaffPortalSessionCookies,
  writePendingSessionCookie,
  writeSessionCookie,
  type HMSSession,
  type RoleKey,
} from "@/lib/auth/session";
import {
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { createClient } from "@/lib/supabase/server";

function isAllowedNext(next: string): boolean {
  if (!next.startsWith(INTERNAL_PREFIX)) return false;
  try {
    const u = new URL(next, "http://localhost");
    return u.pathname === next && !next.includes("//");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const nextUrl = String(formData.get("next") ?? "").trim();

  const loginError = (code: string) =>
    NextResponse.redirect(new URL(`/login?error=${code}`, request.url));

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
    .select("full_name, email, department, role, avatar_url, is_active, must_change_password")
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

  if (profile.must_change_password) {
    await clearStaffPortalSessionCookies();
    await writePendingSessionCookie(session);
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  await clearStaffPortalSessionCookies();
  await writeSessionCookie(session);

  const store = await cookies();
  const opts = { ...sessionCookieOptions, secure: process.env.NODE_ENV === "production" };
  store.set(sessionCookieName, "authenticated", opts);
  store.set(sessionDepartmentCookieName, profile.department, opts);
  store.set(sessionStaffNameCookieName, profile.full_name, opts);

  const destination = nextUrl && isAllowedNext(nextUrl) ? nextUrl : getDepartmentHomePath(profile.department);
  return NextResponse.redirect(new URL(destination, request.url));
}
