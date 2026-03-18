"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendPasswordResetAction(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  if (!email) return { success: false, error: "Email is required." };

  const supabase = await createClient();
  if (!supabase) return { success: false, error: "Authentication service not configured." };

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { success: false, error: error.message };

  return { success: true };
}
