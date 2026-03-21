import { NextResponse } from "next/server";
import { clearStaffPortalSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearStaffPortalSessionCookies();

  return NextResponse.redirect(new URL("/staff/login", request.url));
}
