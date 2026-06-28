import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { isDBDepartmentKey } from "@/lib/constants/navigation";
import { canManageDepartmentRota } from "@/lib/rota/dept-access";
import {
  createRotaAssignmentAdmin,
  deleteRotaAssignmentAdmin,
  getRotaByDepartmentAdmin,
} from "@/modules/workforce/rota/service";
import type { ShiftType } from "@/modules/workforce/rota/types";

const VALID_SHIFT_TYPES = new Set<ShiftType>([
  "morning",
  "afternoon",
  "evening",
  "night",
  "on_call",
]);

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const unitName = searchParams.get("unitName") ?? undefined;

  if (!isDBDepartmentKey(department) || !from || !to) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  if (!canManageDepartmentRota(session, department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const assignments = await getRotaByDepartmentAdmin(department, from, to, unitName || undefined);
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const department = String(body?.department ?? "");
  const staffId = String(body?.staffId ?? "").trim();
  const shiftDate = String(body?.shiftDate ?? "").trim();
  const shiftType = String(body?.shiftType ?? "").trim() as ShiftType;
  const shiftStart = String(body?.shiftStart ?? "").trim();
  const shiftEnd = String(body?.shiftEnd ?? "").trim();
  const unitName = body?.unitName ? String(body.unitName).trim() : undefined;

  if (
    !isDBDepartmentKey(department) ||
    !staffId ||
    !shiftDate ||
    !VALID_SHIFT_TYPES.has(shiftType) ||
    !shiftStart ||
    !shiftEnd
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!canManageDepartmentRota(session, department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const createdBy = session.auth_user_id ?? session.staff_id;
  const result = await createRotaAssignmentAdmin(
    {
      staff_id: staffId,
      department,
      unit_id: null,
      unit_name: unitName ?? null,
      shift_date: shiftDate,
      shift_type: shiftType,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      notes: null,
    },
    createdBy,
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const assignments = await getRotaByDepartmentAdmin(department, shiftDate, shiftDate);
  const assignment = assignments.find((row) => row.id === result.id) ?? null;
  return NextResponse.json({ assignment, id: result.id });
}

export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("id") ?? "";
  const department = searchParams.get("department") ?? "";

  if (!assignmentId || !isDBDepartmentKey(department)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  if (!canManageDepartmentRota(session, department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await deleteRotaAssignmentAdmin(assignmentId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
