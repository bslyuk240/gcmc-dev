"use server";

import { redirect } from "next/navigation";
import { clearManagementSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function logoutStaffAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  // Clear only the management portal cookies — staff portal session is unaffected
  await clearManagementSessionCookies();

  redirect("/login");
}
