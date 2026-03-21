import { NextResponse } from "next/server";
import { clearManagementSessionCookies } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  await clearManagementSessionCookies();

  return NextResponse.redirect(new URL("/login", request.url));
}
