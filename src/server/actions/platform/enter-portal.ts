"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRolePermissions } from "@/lib/auth/build-session";
import {
  clearManagementSessionCookies,
  clearStaffPortalSessionCookies,
  writeSessionCookie,
  writeStaffPortalSessionCookie,
  writeTenantSlugCookie,
} from "@/lib/auth/session";
import type { HMSSession } from "@/lib/auth/session-types";
import { getPlatformProfile } from "@/lib/server/platformAccess";
import {
  getHospitalPortal,
  portalActingRole,
  type HospitalPortal,
} from "@/lib/platform/portals";
import {
  logAuditEvent,
} from "@/lib/audit/log-event";
import { createClient } from "@/lib/supabase/server";

export type EnterHospitalPortalResult =
  | { success: true }
  | { success: false; error: string };

async function upsertPlatformTenantSession(
  userId: string,
  hospitalId: string,
  portal: HospitalPortal,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return "Server configuration error.";

  const { error } = await admin.from("platform_tenant_sessions").upsert(
    {
      user_id: userId,
      hospital_id: hospitalId,
      department: portal.department,
      role: portalActingRole(portal),
      portal_type: portal.portalType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return error.message;
  return null;
}

export async function enterHospitalPortalAction(
  hospitalId: string,
  portalKey: string,
): Promise<EnterHospitalPortalResult> {
  const profile = await getPlatformProfile();
  if (!profile) {
    return { success: false, error: "Not signed in to the platform console." };
  }

  const portal = getHospitalPortal(portalKey);
  if (!portal) {
    return { success: false, error: "Unknown portal." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { success: false, error: "Server configuration error." };
  }

  const { data: hospital, error: hospitalError } = await admin
    .from("hospitals")
    .select("id, slug, name, status")
    .eq("id", hospitalId)
    .maybeSingle();

  if (hospitalError || !hospital) {
    return { success: false, error: "Hospital not found." };
  }

  if (hospital.status === "suspended") {
    return {
      success: false,
      error: "This hospital is suspended. Reactivate it before entering portals.",
    };
  }

  const dbError = await upsertPlatformTenantSession(profile.id, hospital.id, portal);
  if (dbError) {
    return { success: false, error: dbError };
  }

  const supabase = await createClient();
  const permissions = supabase
    ? await fetchRolePermissions(supabase, portalActingRole(portal))
    : ["*:*:*"];

  const session: HMSSession = {
    staff_id: profile.id,
    auth_user_id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    department: portal.department,
    role: portalActingRole(portal),
    hospital_id: hospital.id,
    hospital_slug: hospital.slug,
    permissions,
    issued_at: new Date().toISOString(),
    platform_entry: true,
  };

  await writeTenantSlugCookie(hospital.slug);

  if (portal.portalType === "staff") {
    await clearManagementSessionCookies();
    await writeStaffPortalSessionCookie(session);
  } else {
    await clearStaffPortalSessionCookies();
    await writeSessionCookie(session);
  }

  const headerStore = await headers();

  await logAuditEvent({
    action: "platform.tenant.enter",
    portal: portal.portalType === "staff" ? "staff" : "management",
    actorId: profile.id,
    actorName: profile.full_name,
    hospitalId: hospital.id,
    department: portal.department,
    entityType: "hospital",
    entityId: hospital.id,
    payload: {
      hospital_slug: hospital.slug,
      hospital_name: hospital.name,
      portal: portal.key,
      portal_label: portal.label,
      portal_type: portal.portalType,
      department: portal.department,
      entered_from: "platform_console",
      platform_operator: true,
    },
    ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headerStore.get("user-agent"),
  });

  redirect(portal.path);
}
