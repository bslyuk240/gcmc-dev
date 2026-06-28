import type { StaffProfileRecord } from "@/lib/auth/profile";

export const PLATFORM_ADMIN_ROLE = "platform_admin" as const;
export const PLATFORM_STAFF_ROLE = "platform_staff" as const;
export type PlatformRole = typeof PLATFORM_ADMIN_ROLE | typeof PLATFORM_STAFF_ROLE;

const PLATFORM_ROLES = new Set<string>([PLATFORM_ADMIN_ROLE, PLATFORM_STAFF_ROLE]);

/** True for platform_admin OR platform_staff — use for layout-level access. */
export function isPlatformProfile(
  profile: StaffProfileRecord | null | undefined,
): profile is StaffProfileRecord & { role: PlatformRole } {
  if (!profile) return false;
  if (!PLATFORM_ROLES.has(profile.role)) return false;
  if (profile.is_active === false) return false;
  return profile.hospital_id == null;
}

/** True for platform_admin only — use for admin-only page guards. */
export function isPlatformAdminProfile(
  profile: StaffProfileRecord | null | undefined,
): profile is StaffProfileRecord & { role: typeof PLATFORM_ADMIN_ROLE } {
  return isPlatformProfile(profile) && profile?.role === PLATFORM_ADMIN_ROLE;
}

export function platformAdminProfileFromLegacy(input: {
  id: string;
  email: string;
  full_name: string;
}): StaffProfileRecord {
  return {
    id: input.id,
    email: input.email,
    full_name: input.full_name,
    department: "admin",
    role: PLATFORM_ADMIN_ROLE,
    hospital_id: null,
    is_active: true,
  };
}
