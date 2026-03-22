"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout action for the Staff Self-Service Portal.
 * Clears all portal session cookies so switching portals requires a fresh login.
 */
export async function logoutStaffPortalAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearSessionCookies();

  redirect("/staff/login");
}
