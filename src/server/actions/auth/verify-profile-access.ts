"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Verify the current user's password via Supabase reauthentication.
 * Used before allowing access to sensitive profile/settings pages.
 */
export async function verifyProfileAccessAction(password: string): Promise<{ success: boolean; error?: string }> {
  const p = password.trim();
  if (!p) {
    return { success: false, error: "Please enter your password." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Authentication service is not configured." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return { success: false, error: "No active session found. Please log in again." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: p,
  });

  if (error) {
    return { success: false, error: "Incorrect password." };
  }

  return { success: true };
}
