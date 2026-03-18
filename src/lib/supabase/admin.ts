import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * ONLY use in server actions — never expose to the browser.
 * Bypasses RLS, so use with care.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
