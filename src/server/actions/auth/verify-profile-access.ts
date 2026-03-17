"use server";

/**
 * Verify the current user's password before allowing access to full profile/settings.
 * Replace with Supabase auth reauthenticate (e.g. signInWithPassword with current user email + provided password) when wired.
 */
export async function verifyProfileAccessAction(password: string): Promise<{ success: boolean; error?: string }> {
  const p = password.trim();
  if (!p) {
    return { success: false, error: "Please enter your password." };
  }
  // TODO: verify against current session (e.g. Supabase reauthenticate). For now accept any non-empty password for demo.
  return { success: true };
}
