import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStaffPortalSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword.trim() : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword.trim() : "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: "Please fill in all password fields." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });

  if (reauthError) {
    return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
