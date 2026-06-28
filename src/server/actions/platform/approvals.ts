"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { guardPlatformAction } from "@/lib/platform/guard-action";
import { logPlatformAudit } from "@/lib/platform/audit";
import { sanitizeSettingsInput } from "@/lib/tenant/branding";
import {
  notifyHospitalSignupApproved,
  notifyHospitalSignupRejected,
  notifyHospitalSignupSubmitted,
} from "@/lib/email/notifications";

export type SignupRequest = {
  id: string;
  hospital_name: string;
  slug: string;
  short_name: string | null;
  plan: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  owner_name: string;
  owner_email: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  notes: string | null;
  hospital_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function mapRequest(row: Record<string, unknown>): SignupRequest {
  return {
    id: String(row.id),
    hospital_name: String(row.hospital_name),
    slug: String(row.slug),
    short_name: row.short_name ? String(row.short_name) : null,
    plan: String(row.plan),
    contact_email: String(row.contact_email),
    contact_phone: row.contact_phone ? String(row.contact_phone) : null,
    address: row.address ? String(row.address) : null,
    owner_name: String(row.owner_name),
    owner_email: String(row.owner_email),
    status: row.status as SignupRequest["status"],
    rejection_reason: row.rejection_reason ? String(row.rejection_reason) : null,
    notes: row.notes ? String(row.notes) : null,
    hospital_id: row.hospital_id ? String(row.hospital_id) : null,
    created_at: String(row.created_at),
    reviewed_at: row.reviewed_at ? String(row.reviewed_at) : null,
  };
}

export async function listSignupRequestsAction(status?: SignupRequest["status"]) {
  return guardPlatformAction(async () => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    let query = db
      .from("hospital_signup_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map((r) => mapRequest(r as Record<string, unknown>)) };
  });
}

const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function randomPart(len = 8) {
  return Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function approveSignupRequestAction(requestId: string) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    // Fetch request
    const { data: req, error: fetchErr } = await db
      .from("hospital_signup_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchErr) return { success: false, error: fetchErr.message };
    if (!req) return { success: false, error: "Request not found or already reviewed." };

    const request = mapRequest(req as Record<string, unknown>);

    // 1. Create the hospital
    const settings = sanitizeSettingsInput({
      email: request.contact_email,
      phone: request.contact_phone ?? undefined,
      address: request.address ?? undefined,
    });

    const { data: hospital, error: hospitalErr } = await db
      .from("hospitals")
      .insert({
        slug: request.slug,
        name: request.hospital_name,
        short_name: request.short_name,
        plan: request.plan,
        status: "active",
        settings,
      })
      .select("id")
      .single();

    if (hospitalErr) {
      if (hospitalErr.message.toLowerCase().includes("duplicate")) {
        return { success: false, error: "Hospital slug is already in use." };
      }
      return { success: false, error: hospitalErr.message };
    }

    const hospitalId = hospital.id as string;

    // 2. Create the owner's admin account
    const tempPassword = `HMS@${randomPart(8)}`;

    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email: request.owner_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: request.owner_name,
        role: "admin",
        hospital_id: hospitalId,
      },
    });

    if (authErr) {
      // Roll back hospital creation
      await db.from("hospitals").delete().eq("id", hospitalId);
      return { success: false, error: `Account creation failed: ${authErr.message}` };
    }

    await db.from("staff_profiles").upsert({
      id: authUser.user.id,
      full_name: request.owner_name,
      email: request.owner_email,
      department: "admin",
      role: "admin",
      hospital_id: hospitalId,
      is_active: true,
      must_change_password: true,
    });

    // 3. Mark request as approved
    await db
      .from("hospital_signup_requests")
      .update({
        status: "approved",
        hospital_id: hospitalId,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .eq("id", requestId);

    await logPlatformAudit({
      action: "hospital.onboard_approve",
      actorId: profile.id,
      entityType: "hospital",
      entityId: hospitalId,
      payload: { slug: request.slug, owner_email: request.owner_email },
    });

    await notifyHospitalSignupApproved({
      hospitalName: request.hospital_name,
      hospitalSlug: request.slug,
      ownerName: request.owner_name,
      ownerEmail: request.owner_email,
      tempPassword,
    });

    return {
      success: true,
      data: { hospitalId, tempPassword, ownerEmail: request.owner_email },
    };
  });
}

export async function rejectSignupRequestAction(requestId: string, reason?: string) {
  return guardPlatformAction(async ({ profile }) => {
    const db = createAdminClient();
    if (!db) return { success: false, error: "Service not configured." };

    const { data: req, error: fetchErr } = await db
      .from("hospital_signup_requests")
      .select("hospital_name, owner_name, owner_email")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchErr) return { success: false, error: fetchErr.message };
    if (!req) return { success: false, error: "Request not found or already reviewed." };

    const { error } = await db
      .from("hospital_signup_requests")
      .update({
        status: "rejected",
        rejection_reason: reason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .eq("id", requestId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    await logPlatformAudit({
      action: "hospital.signup_rejected",
      actorId: profile.id,
      entityType: "hospital_signup_requests",
      entityId: requestId,
      payload: { reason: reason ?? null },
    });

    await notifyHospitalSignupRejected({
      hospitalName: String(req.hospital_name),
      ownerName: String(req.owner_name),
      ownerEmail: String(req.owner_email),
      reason,
    });

    return { success: true, data: null };
  });
}

// Public-facing server action (no auth required)
export async function submitHospitalSignupAction(input: {
  hospital_name: string;
  slug: string;
  short_name?: string;
  plan: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  owner_name: string;
  owner_email: string;
}) {
  "use server";

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  if (!supabase) return { success: false as const, error: "Service unavailable." };

  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(slug)) {
    return { success: false as const, error: "Invalid slug — use lowercase letters, numbers, and hyphens only." };
  }
  if (!input.hospital_name.trim()) return { success: false as const, error: "Hospital name is required." };
  if (!input.owner_email.trim()) return { success: false as const, error: "Owner email is required." };

  const { error } = await supabase.from("hospital_signup_requests").insert({
    hospital_name: input.hospital_name.trim().slice(0, 200),
    slug,
    short_name: input.short_name?.trim().slice(0, 20) || null,
    plan: input.plan,
    contact_email: input.contact_email.trim().toLowerCase(),
    contact_phone: input.contact_phone?.trim() || null,
    address: input.address?.trim() || null,
    owner_name: input.owner_name.trim().slice(0, 100),
    owner_email: input.owner_email.trim().toLowerCase(),
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
      return { success: false as const, error: "A registration with this slug is already pending review." };
    }
    return { success: false as const, error: error.message };
  }

  await notifyHospitalSignupSubmitted({
    hospitalName: input.hospital_name.trim(),
    slug,
    ownerName: input.owner_name.trim(),
    ownerEmail: input.owner_email.trim().toLowerCase(),
    plan: input.plan,
  });

  return { success: true as const, data: null };
}
