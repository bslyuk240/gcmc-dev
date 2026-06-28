import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isPlatformProfile,
  isPlatformAdminProfile,
  platformAdminProfileFromLegacy,
  PLATFORM_ADMIN_ROLE,
  type PlatformRole,
} from "@/lib/auth/platform-profile";
import type { StaffProfileRecord } from "@/lib/auth/profile";
import { verifyPlatformAdmin } from "@/lib/platform/audit";

export type PlatformProfile = StaffProfileRecord & { role: PlatformRole };

async function loadProfile(userId: string, email: string): Promise<StaffProfileRecord | null> {
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase
      .from("staff_profiles")
      .select("id, full_name, email, department, role, hospital_id, is_active, must_change_password")
      .eq("id", userId)
      .maybeSingle();
    if (data) return data as StaffProfileRecord;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("staff_profiles")
    .select("id, full_name, email, department, role, hospital_id, is_active, must_change_password")
    .eq("id", userId)
    .maybeSingle();

  if (data) return data as StaffProfileRecord;

  const legacy = await verifyPlatformAdmin(userId);
  if (legacy) return platformAdminProfileFromLegacy(legacy);

  if (email) {
    const { data: byEmail } = await admin
      .from("staff_profiles")
      .select("id, full_name, email, department, role, hospital_id, is_active, must_change_password")
      .eq("email", email)
      .maybeSingle();
    return (byEmail as StaffProfileRecord | null) ?? null;
  }

  return null;
}

/** Returns the platform profile if the user is platform_admin or platform_staff. */
export async function getPlatformProfile(): Promise<PlatformProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await loadProfile(user.id, user.email ?? "");
  return isPlatformProfile(profile) ? (profile as PlatformProfile) : null;
}

/** Allows platform_admin and platform_staff. Use for layout-level guards. */
export async function requirePlatformAccess(): Promise<PlatformProfile> {
  const profile = await getPlatformProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Allows platform_admin only. Use for admin-only page guards. Redirects staff to dashboard. */
export async function requirePlatformAdmin(): Promise<PlatformProfile & { role: typeof PLATFORM_ADMIN_ROLE }> {
  const profile = await getPlatformProfile();
  if (!profile) redirect("/login");
  if (!isPlatformAdminProfile(profile)) redirect("/platform/dashboard");
  return profile as PlatformProfile & { role: typeof PLATFORM_ADMIN_ROLE };
}
