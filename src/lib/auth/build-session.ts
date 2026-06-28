import type { SupabaseClient } from "@supabase/supabase-js";
import type { HMSSession, RoleKey } from "@/lib/auth/session-types";
import { departmentHomePaths, type DepartmentKey } from "@/lib/constants/navigation";
import type { StaffProfileRecord } from "@/lib/auth/profile";
import type { Hospital } from "@/lib/tenant/types";

function isDepartmentKey(value: string): value is DepartmentKey {
  return value in departmentHomePaths;
}

export type LoginRejectReason =
  | "profile"
  | "inactive"
  | "invalid"
  | "tenant"
  | "credentials";

export function staffProfileEligibleForLogin(
  profile: StaffProfileRecord | null,
  hospital: Hospital,
): profile is StaffProfileRecord {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (!isDepartmentKey(profile.department)) return false;
  if (!profile.hospital_id || profile.hospital_id !== hospital.id) return false;
  return true;
}

export async function fetchRolePermissions(
  supabase: SupabaseClient,
  role: string,
): Promise<string[]> {
  const { data: permRows } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", role);

  return (permRows ?? []).map((r: { permission: string }) => r.permission);
}

export function buildHMSSession(
  profile: StaffProfileRecord,
  hospital: Hospital,
  permissions: string[],
  authUserId: string,
): HMSSession {
  return {
    staff_id: profile.id,
    auth_user_id: authUserId,
    full_name: profile.full_name,
    email: profile.email,
    avatar_url: profile.avatar_url ?? null,
    department: profile.department as HMSSession["department"],
    role: profile.role as RoleKey,
    hospital_id: hospital.id,
    hospital_slug: hospital.slug,
    permissions,
    issued_at: new Date().toISOString(),
  };
}
