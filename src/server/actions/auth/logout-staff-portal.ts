"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout action specifically for the Staff Self-Service Portal.
 * Signs out from Supabase, clears all session cookies, then redirects
 * back to the staff portal login page (not the department work portal login).
 */
export async function logoutStaffPortalAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearSessionCookies();

  redirect("/staff/login");
}
