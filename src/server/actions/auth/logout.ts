"use server";

import { redirect } from "next/navigation";
import { clearSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function logoutStaffAction() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearSessionCookies();

  redirect("/login");
}
