"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deserialiseSession,
  writeSessionCookie,
  getDepartmentHomePath,
} from "@/lib/auth/session";
import {
  hmsPendingSessionCookieName,
  sessionCookieName,
  sessionDepartmentCookieName,
  sessionStaffNameCookieName,
  sessionCookieOptions,
} from "@/lib/auth/constants";

export async function changePasswordAction(formData: FormData) {
  const newPassword     = String(formData.get("password")         ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!newPassword || newPassword.length < 8) {
    redirect("/change-password?error=too-short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=mismatch");
  }

  const store = await cookies();
  const pendingRaw = store.get(hmsPendingSessionCookieName)?.value;
  if (!pendingRaw) redirect("/login");

  const pendingSession = await deserialiseSession(pendingRaw);
  if (!pendingSession) redirect("/login");

  const supabase = await createClient();
  if (!supabase) redirect("/change-password?error=configuration");

  // Update the password using the active Supabase session (set during login)
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) redirect("/change-password?error=failed");

  // Clear the must_change_password flag
  const admin = createAdminClient();
  if (admin) {
    await admin
      .from("staff_profiles")
      .update({ must_change_password: false })
      .eq("hospital_id", pendingSession.hospital_id)
      .eq("id", pendingSession.staff_id);
  }

  // Promote the pending session to a real HMS session
  await writeSessionCookie(pendingSession);

  // Write legacy cookies
  const opts = { ...sessionCookieOptions, secure: process.env.NODE_ENV === "production" };
  store.set(sessionCookieName,           "authenticated",          opts);
  store.set(sessionDepartmentCookieName, pendingSession.department, opts);
  store.set(sessionStaffNameCookieName,  pendingSession.full_name,  opts);

  // Clear the pending session cookie
  store.delete(hmsPendingSessionCookieName);

  redirect(getDepartmentHomePath(pendingSession.department));
}
