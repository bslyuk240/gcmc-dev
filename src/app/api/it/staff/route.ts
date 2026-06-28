import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { canManageItHelpdesk, canViewItHelpdesk } from "@/lib/it/access";
import { listHospitalStaffAdmin, updateStaffAccessAdmin } from "@/lib/it/service";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canViewItHelpdesk(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const staff = await listHospitalStaffAdmin();
  return NextResponse.json({ staff });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canManageItHelpdesk(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const staffId = String(body?.staffId ?? "").trim();
  const isActive = body?.isActive !== undefined ? Boolean(body.isActive) : undefined;
  const role = body?.role ? String(body.role).trim() : undefined;

  if (!staffId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await updateStaffAccessAdmin({ staffId, isActive, role });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ staff: result.staff });
}
