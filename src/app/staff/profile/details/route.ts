import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffPortalSession } from "@/lib/auth/session";

function isMissingColumnError(message: string, column: string) {
  return message.toLowerCase().includes(`column ${column.toLowerCase()} does not exist`);
}

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const homeAddress = typeof body?.homeAddress === "string"
    ? body.homeAddress.trim()
    : typeof body?.home_address === "string"
      ? body.home_address.trim()
      : "";

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const payload: Record<string, string | null> = {
    phone: phone || null,
    home_address: homeAddress || null,
  };

  let { error } = await admin
    .from("staff_profiles")
    .update(payload)
    .eq("id", session.staff_id);

  if (error && isMissingColumnError(error.message, "staff_profiles.home_address")) {
    ({ error } = await admin
      .from("staff_profiles")
      .update({ phone: payload.phone })
      .eq("id", session.staff_id));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ phone, homeAddress });
}
