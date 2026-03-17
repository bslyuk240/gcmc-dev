"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function logoutStaffAction() {
  // Sign out from Supabase (invalidates the JWT on the server)
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  // Clear all session cookies (v2 + legacy)
  await clearSessionCookies();

  redirect("/login");
}
