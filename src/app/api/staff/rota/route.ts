import { NextResponse } from "next/server";
import { getStaffPortalSession } from "@/lib/auth/session";
import { getMyRotaRange } from "@/modules/workforce/rota/service";

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

  const assignments = await getMyRotaRange(session.staff_id, from, to);

  return NextResponse.json({ assignments });
}
