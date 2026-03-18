"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function resetPasswordAction(formData: FormData) {
  const code            = String(formData.get("code")             ?? "").trim();
  const newPassword     = String(formData.get("password")         ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!code) redirect("/forgot-password?error=invalid-link");
  if (!newPassword || newPassword.length < 8) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}&error=too-short`);
  }
  if (newPassword !== confirmPassword) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}&error=mismatch`);
  }

  const supabase = await createClient();
  if (!supabase) redirect("/reset-password?error=configuration");

  // Exchange the PKCE code for a session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) redirect("/forgot-password?error=expired-link");

  // Update the password
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    redirect(`/reset-password?code=${encodeURIComponent(code)}&error=failed`);
  }

  redirect("/login?message=password-reset");
}
