import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveStaffProfile } from "@/lib/auth/profile";
import {
  isPlatformAdminProfile,
  platformAdminProfileFromLegacy,
} from "@/lib/auth/platform-profile";
import { verifyPlatformAdmin } from "@/lib/platform/audit";
import {
  getDepartmentHomePath,
  isDepartmentKey,
} from "@/lib/auth/session";
import { logPlatformAudit } from "@/lib/platform/audit";
import { resolveLoginHospital } from "@/lib/tenant/login-tenant";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return null;
  }
  return next;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=configuration", request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
  let profile = await resolveStaffProfile(supabase, user.id, user.email ?? "");

  if (!isPlatformAdminProfile(profile)) {
    const legacyPlatformAdmin = await verifyPlatformAdmin(user.id);
    if (legacyPlatformAdmin) {
      profile = platformAdminProfileFromLegacy(legacyPlatformAdmin);
    }
  }

  if (isPlatformAdminProfile(profile)) {
    await logPlatformAudit({
      action: "login",
      actorId: profile.id,
      payload: { role: profile.role },
    });

    const destination =
      nextPath && nextPath.startsWith("/platform") ? nextPath : "/platform/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (nextPath && nextPath.startsWith(INTERNAL_PREFIX)) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (nextPath && nextPath.startsWith("/staff")) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  const hospital = await resolveLoginHospital();
  if (!profile || !hospital || profile.hospital_id !== hospital.id) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=credentials", request.url));
  }

  if (!isDepartmentKey(profile.department)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  return NextResponse.redirect(
    new URL(getDepartmentHomePath(profile.department), request.url),
  );
}
