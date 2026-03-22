import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerSession } from "@/lib/auth/session";
import { isDBDepartmentKey } from "@/lib/constants/navigation";
import {
  getRotaSwapRequests,
  reviewRotaSwapRequest,
} from "@/modules/workforce/rota/service";

function canManageDepartment(role: string, sessionDepartment: string, requestDepartment: string) {
  if (role === "admin" || role === "hr_manager" || role === "hr_staff") return true;
  return role === "hod" && sessionDepartment === requestDepartment;
}

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

  if (!canManageDepartment(session.role, session.department, department)) {
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

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { data: requestRow, error: fetchError } = await admin
    .from("rota_swap_requests")
    .select("id, department")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  }

  const requestDepartment = String((requestRow as { department?: string }).department ?? "");
  if (!canManageDepartment(session.role, session.department, requestDepartment)) {
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

  return NextResponse.json({ request: reviewed });
}
