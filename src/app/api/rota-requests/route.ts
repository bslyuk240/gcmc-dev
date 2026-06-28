import { NextResponse } from "next/server";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { getServerSession } from "@/lib/auth/session";
import { isDBDepartmentKey, type DBDepartmentKey } from "@/lib/constants/navigation";
import { canManageDepartmentRota } from "@/lib/rota/dept-access";
import {
  getRotaSwapRequests,
  reviewRotaSwapRequest,
} from "@/modules/workforce/rota/service";
import { notifyRotaSwapReviewed } from "@/lib/email/notifications";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? "";
  if (!isDBDepartmentKey(department)) {
    return NextResponse.json({ error: "missing_department" }, { status: 400 });
  }

  if (!canManageDepartmentRota(session, department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const requests = await getRotaSwapRequests(department);
  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestId = String(body?.requestId ?? "").trim();
  const status = String(body?.status ?? "").trim();
  const reviewNote = String(body?.reviewNote ?? "").trim();

  if (!requestId || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  const { data: requestRow, error: fetchError } = await admin
    .from("rota_swap_requests")
    .select("id, department")
    .eq("hospital_id", hospitalId)
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const requestDepartment = String((requestRow as { department?: string }).department ?? "");
  if (!isDBDepartmentKey(requestDepartment) || !canManageDepartmentRota(session, requestDepartment)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const reviewed = await reviewRotaSwapRequest(
    requestId,
    status as "approved" | "rejected" | "cancelled",
    session.staff_id,
    reviewNote || undefined,
  );

  if (!reviewed) {
    return NextResponse.json({ error: "failed_to_update_request" }, { status: 500 });
  }

  await notifyRotaSwapReviewed({
    staffId: reviewed.staffId,
    status: reviewed.status,
    shiftDate: reviewed.shiftDate,
    reviewNote: reviewed.reviewNote,
  });

  return NextResponse.json({ request: reviewed });
}
