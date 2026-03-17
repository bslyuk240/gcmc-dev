"use server";

import { redirect } from "next/navigation";
import { clearStaffPortalSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout action for the Staff Self-Service Portal.
 * Clears ONLY the staff portal session cookie — management portal session is unaffected.
 */
export async function logoutStaffPortalAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearStaffPortalSessionCookies();

  redirect("/staff/login");
}
