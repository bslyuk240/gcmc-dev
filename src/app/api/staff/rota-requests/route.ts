import { NextResponse } from "next/server";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { getStaffPortalSession } from "@/lib/auth/session";
import { createRotaSwapRequest, getMyRotaSwapRequests } from "@/modules/workforce/rota/service";
import type { ShiftType } from "@/modules/workforce/rota/types";
import { notifyRotaSwapSubmitted } from "@/lib/email/notifications";

export async function GET() {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const requests = await getMyRotaSwapRequests(session.staff_id);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const assignmentId = String(body?.assignmentId ?? "").trim();
  const reason = String(body?.reason ?? "").trim();

  if (!assignmentId) {
    return NextResponse.json({ error: "missing_assignment" }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  const { data: assignment, error: assignmentError } = await admin
    .from("rota_assignments")
    .select("id, staff_id, department, shift_date, shift_type, shift_start, shift_end, unit_id")
    .eq("hospital_id", hospitalId)
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  if (!assignment) {
    return NextResponse.json({ error: "assignment_not_found" }, { status: 404 });
  }

  const assignmentRow = assignment as Record<string, unknown>;

  if ((assignmentRow.staff_id as string) !== session.staff_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const created = await createRotaSwapRequest({
    assignmentId: assignmentRow.id as string,
    staffId: session.staff_id,
    staffName: session.full_name,
    department: assignmentRow.department as DBDepartmentKey,
    shiftDate: assignmentRow.shift_date as string,
    shiftType: assignmentRow.shift_type as ShiftType,
    shiftStart: (assignmentRow.shift_start as string) ?? null,
    shiftEnd: (assignmentRow.shift_end as string) ?? null,
    unitId: (assignmentRow.unit_id as string) ?? null,
    unitName: null,
    reason: reason || null,
  });

  if (!created) {
    return NextResponse.json({ error: "failed_to_create_request" }, { status: 500 });
  }

  await notifyRotaSwapSubmitted({
    staffName: created.staffName,
    department: created.department,
    shiftDate: created.shiftDate,
    shiftType: created.shiftType,
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
