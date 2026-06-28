"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logPlatformAudit } from "@/lib/platform/audit";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { notifyHospitalAdminProvisioned } from "@/lib/email/notifications";

export type ProvisionHospitalAdminInput = {
  hospital_id: string;
  full_name: string;
  email: string;
};

export async function provisionHospitalAdminAction(input: ProvisionHospitalAdminInput) {
  return guardPlatformAction(async ({ profile }) => {
    const full_name = input.full_name.trim();
    const email = input.email.trim().toLowerCase();
    const hospitalId = input.hospital_id;

    if (!full_name || !email || !hospitalId) {
      return { success: false, error: "All fields are required." };
    }

    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: hospital, error: hospitalError } = await db
      .from("hospitals")
      .select("id, slug, short_name, status")
      .eq("id", hospitalId)
      .maybeSingle();

    if (hospitalError || !hospital) {
      return { success: false, error: "Hospital not found." };
    }

    const tempPassword = generateTempPassword(
      hospital.short_name != null ? String(hospital.short_name) : String(hospital.slug),
    );

    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, hospital_id: hospitalId },
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message ?? "Failed to create auth user.",
      };
    }

    const userId = authData.user.id;

    const { error: profileError } = await db.from("staff_profiles").upsert(
      {
        id: userId,
        full_name,
        email,
        department: "admin",
        role: "admin",
        hospital_id: hospitalId,
        is_active: true,
        must_change_password: true,
        system_setup_done: false,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      await db.auth.admin.deleteUser(userId);
      return { success: false, error: profileError.message };
    }

    if (hospital.status === "provisioning") {
      await db.from("hospitals").update({ status: "active" }).eq("id", hospitalId);
    }

    await logPlatformAudit({
      action: "hospital.provision_admin",
      actorId: profile.id,
      entityType: "hospital",
      entityId: hospitalId,
      payload: { email, userId },
    });

    await notifyHospitalAdminProvisioned({
      hospitalId,
      fullName: full_name,
      email,
      tempPassword,
    });

    return { success: true, data: { tempPassword, userId, email } };
  });
}

function generateTempPassword(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const safePrefix = prefix.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "HOSP";
  let pass = `${safePrefix}@`;
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}
