"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) redirect("/forgot-password?error=invalid");

  const supabase = await createClient();
  if (!supabase) redirect("/forgot-password?error=configuration");

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;

  // Always redirect to "sent" — never reveal whether the email exists
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  redirect("/forgot-password?sent=1");
}
