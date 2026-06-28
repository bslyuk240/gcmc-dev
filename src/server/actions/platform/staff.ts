"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { logPlatformAudit } from "@/lib/platform/audit";
import { notifyPlatformStaffCreated } from "@/lib/email/notifications";

export type CreatePlatformStaffInput = {
  full_name: string;
  email: string;
  role: "platform_admin" | "platform_staff";
};

const AMBIGUOUS = /[IlO01]/g;
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function randomPassword(len = 10) {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function createPlatformStaffAction(input: CreatePlatformStaffInput) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const email = input.email.trim().toLowerCase();
    const fullName = input.full_name.trim();
    if (!email || !fullName) return { success: false, error: "Name and email are required." };

    const tempPassword = `HMS@${randomPassword(8)}`.replace(AMBIGUOUS, "x");

    const { data: authUser, error: authError } = await db.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: input.role,
      },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already")) {
        return { success: false, error: "An account with this email already exists." };
      }
      return { success: false, error: authError.message };
    }

    const userId = authUser.user.id;

    await db.from("staff_profiles").upsert({
      id: userId,
      full_name: fullName,
      email,
      department: "admin",
      role: input.role,
      hospital_id: null,
      is_active: true,
      must_change_password: true,
    });

    await logPlatformAudit({
      action: "platform.staff_created",
      actorId: profile.id,
      entityType: "staff_profile",
      entityId: userId,
      payload: { email, role: input.role },
    });

    await notifyPlatformStaffCreated({
      fullName,
      email,
      role: input.role,
      tempPassword,
    });

    return { success: true, data: { tempPassword } };
  });
}

export async function listPlatformStaffAction() {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data, error } = await db
      .from("staff_profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .in("role", ["platform_admin", "platform_staff"])
      .order("created_at", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  });
}

export async function togglePlatformStaffActiveAction(staffId: string, isActive: boolean) {
  return guardPlatformAction(async ({ profile }) => {
    if (staffId === profile.id) return { success: false, error: "You cannot deactivate yourself." };

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { error } = await db
      .from("staff_profiles")
      .update({ is_active: isActive })
      .eq("id", staffId)
      .in("role", ["platform_admin", "platform_staff"]);

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "platform.staff_updated",
      actorId: profile.id,
      entityType: "staff_profile",
      entityId: staffId,
      payload: { is_active: isActive },
    });

    return { success: true, data: null };
  });
}
