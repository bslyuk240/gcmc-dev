import { NextResponse } from "next/server";
import { getStaffPortalSession } from "@/lib/auth/session";
import {
  clockInAttendance,
  clockOutAttendance,
  fetchAttendanceRecord,
  fetchAttendanceRecords,
} from "@/modules/workforce/attendance/service";
import type { AttendanceStatus } from "@/modules/workforce/attendance/types";

function isValidStatus(status: string): status is AttendanceStatus {
  return ["Present", "Late", "Half-day", "Absent", "Leave", "Holiday"].includes(status);
}

export async function GET(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const scope = url.searchParams.get("scope");

  const records = scope === "today"
    ? await fetchAttendanceRecords({ staffId: session.staff_id, from: to ?? from, to: to ?? from })
    : await fetchAttendanceRecords({ staffId: session.staff_id, from, to });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "").trim();
  const attendanceDate = String(body?.attendanceDate ?? "").trim();

  if (!attendanceDate || !["clock-in", "clock-out"].includes(action)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (action === "clock-in") {
    const clockInAt = String(body?.clockInAt ?? "").trim();
    const status = String(body?.status ?? "").trim();
    const unit = String(body?.unit ?? session.department).trim();

    if (!clockInAt || !isValidStatus(status)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    const record = await clockInAttendance({
      staffId: session.staff_id,
      staffName: session.full_name,
      department: session.department,
      role: session.role,
      attendanceDate,
      clockInAt,
      status,
      unit,
    });

    if (!record) {
      return NextResponse.json({ error: "failed_to_clock_in" }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  }

  const clockOutAt = String(body?.clockOutAt ?? "").trim();
  if (!clockOutAt) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const existing = await fetchAttendanceRecord(session.staff_id, attendanceDate);
  if (!existing) {
    return NextResponse.json({ error: "record_not_found" }, { status: 404 });
  }

  if (existing.clockOutAt) {
    return NextResponse.json({ record: existing });
  }

  const record = await clockOutAttendance({
    staffId: session.staff_id,
    attendanceDate,
    clockOutAt,
  });

  if (!record) {
    return NextResponse.json({ error: "failed_to_clock_out" }, { status: 500 });
  }

  return NextResponse.json({ record });
}

