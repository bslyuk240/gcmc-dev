"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { canManageItHelpdesk } from "@/lib/it/access";
import { getStaffEmailInHospital } from "@/lib/it/service";
import { logAuditEvent } from "@/lib/audit/log-event";

export async function sendPasswordResetAction(
  email: string,
  staffId?: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (!canManageItHelpdesk(session)) {
    return { success: false, error: "You do not have permission to reset passwords." };
  }

  if (!email) return { success: false, error: "Email is required." };

  if (staffId) {
    const tenantEmail = await getStaffEmailInHospital({ staffId });
    if (!tenantEmail || tenantEmail.toLowerCase() !== email.toLowerCase()) {
      return { success: false, error: "Staff account not found in this hospital." };
    }
  }

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Authentication service not configured." };

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { success: false, error: error.message };

  void logAuditEvent({
    action: "it.password_reset_sent",
    portal: "management",
    actorId: session.staff_id,
    actorName: session.full_name,
    hospitalId: session.hospital_id,
    department: session.department,
    entityType: "staff_profile",
    entityId: staffId ?? null,
    payload: { email },
  });

  return { success: true };
}
