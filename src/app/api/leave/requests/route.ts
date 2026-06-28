import { NextResponse } from "next/server";
import { getServerSession, getStaffPortalSession } from "@/lib/auth/session";
import { isDBDepartmentKey } from "@/lib/constants/navigation";
import {
  canReviewAnyLeave,
  canReviewLeaveForDepartment,
  canReviewLeaveRequest,
} from "@/lib/leave/access";
import {
  createLeaveRequestAdmin,
  listLeaveRequestsAdmin,
  listLeaveRequestsForStaff,
  reviewLeaveRequestAdmin,
} from "@/lib/leave/service";
import {
  notifyLeaveReviewed,
  notifyLeaveSubmitted,
} from "@/lib/email/notifications";

async function resolveSession() {
  const management = await getServerSession();
  if (management) return management;
  return getStaffPortalSession();
}

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? "";
  const mine = searchParams.get("mine") === "1";

  if (mine) {
    const requests = session.hospital_id
      ? await listLeaveRequestsForStaff({
          hospitalId: session.hospital_id,
          staffId: session.staff_id,
        })
      : [];
    return NextResponse.json({ requests });
  }

  if (department) {
    if (!isDBDepartmentKey(department)) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
    if (!canReviewLeaveForDepartment(session, department)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const unitName = searchParams.get("unitName") ?? undefined;
    const requests = await listLeaveRequestsAdmin({
      department,
      unitName: department === "non_clinical" ? unitName : undefined,
    });
    return NextResponse.json({ requests });
  }

  if (!canReviewAnyLeave(session)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const requests = await listLeaveRequestsAdmin({});
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const leaveType = String(body?.leaveType ?? "").trim();
  const startDate = String(body?.startDate ?? "").trim();
  const endDate = String(body?.endDate ?? "").trim();
  const reason = String(body?.reason ?? "").trim();
  const days = Number(body?.days ?? 0);

  const validTypes = ["Annual", "Sick", "Maternity", "Paternity", "Personal", "Emergency", "Study"];
  if (!validTypes.includes(leaveType) || !startDate || !endDate || !reason || days <= 0) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const result = await createLeaveRequestAdmin({
    staffId: session.staff_id,
    staffName: session.full_name,
    department: session.department,
    role: session.role.replace(/_/g, " "),
    leaveType: leaveType as import("@/lib/data/hr-store").LeaveType,
    startDate,
    endDate,
    days,
    reason,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyLeaveSubmitted({
    staffName: result.request.staffName,
    department: result.request.department,
    leaveType: result.request.leaveType,
    startDate: result.request.startDate,
    endDate: result.request.endDate,
    days: result.request.days,
  });

  return NextResponse.json({ request: result.request });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const requestId = String(body?.requestId ?? "").trim();
  const status = String(body?.status ?? "").trim();
  const notes = String(body?.notes ?? "").trim();

  if (!requestId || !["Approved", "Rejected"].includes(status)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const scoped = await listLeaveRequestsAdmin({});
  const target = scoped.find((row) => row.id === requestId);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isDBDepartmentKey(target.department)) {
    return NextResponse.json({ error: "invalid_department" }, { status: 400 });
  }

  if (!canReviewLeaveRequest(session, target)) {
    const error = session.role === "hod" && session.staff_id === target.staffId
      ? "cannot_review_own_leave"
      : "forbidden";
    return NextResponse.json({ error }, { status: 403 });
  }

  if (status === "Rejected" && !notes) {
    return NextResponse.json({ error: "rejection_reason_required" }, { status: 400 });
  }

  const result = await reviewLeaveRequestAdmin({
    requestId,
    status: status as "Approved" | "Rejected",
    reviewedBy: session.full_name,
    notes,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyLeaveReviewed({
    staffId: result.request.staffId,
    status: result.request.status,
    leaveType: result.request.leaveType,
    reviewerName: session.full_name,
    notes,
  });

  return NextResponse.json({ request: result.request });
}
