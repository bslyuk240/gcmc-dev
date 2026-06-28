import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffPortalSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "missing_range" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin || !session.hospital_id) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("rota_assignments")
    .select("*")
    .eq("hospital_id", session.hospital_id)
    .eq("staff_id", session.staff_id)
    .gte("shift_date", from)
    .lte("shift_date", to)
    .order("shift_date")
    .order("shift_start");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assignments = data ?? [];

  return NextResponse.json({ assignments });
}
