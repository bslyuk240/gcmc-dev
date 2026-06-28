import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import {
  clockInAttendance,
  clockOutAttendance,
  fetchAttendanceRecord,
  fetchAttendanceRecords,
} from "@/modules/workforce/attendance/service";

// ─── Input schemas ─────────────────────────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const GetSchema = z.object({
  from:  z.string().regex(DATE_RE, "Invalid date format").optional(),
  to:    z.string().regex(DATE_RE, "Invalid date format").optional(),
  scope: z.string().max(32).optional(),
});

const ClockInSchema = z.object({
  action:         z.literal("clock-in"),
  attendanceDate: z.string().regex(DATE_RE, "Invalid date format"),
  clockInAt:      z.string().regex(TIME_RE, "Invalid time format"),
  status:         z.enum(["Present", "Late", "Half-day", "Absent", "Leave", "Holiday"]),
  unit:           z.string().trim().max(100).optional(),
});

const ClockOutSchema = z.object({
  action:         z.literal("clock-out"),
  attendanceDate: z.string().regex(DATE_RE, "Invalid date format"),
  clockOutAt:     z.string().regex(TIME_RE, "Invalid time format"),
});

// Discriminated union means Zod picks the right schema based on `action`.
const PostSchema = z.discriminatedUnion("action", [ClockInSchema, ClockOutSchema]);

// ─── GET — session-scoped: user can only read their own records ────────────────
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url    = new URL(request.url);
  const params = GetSchema.safeParse({
    from:  url.searchParams.get("from")  ?? undefined,
    to:    url.searchParams.get("to")    ?? undefined,
    scope: url.searchParams.get("scope") ?? undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const { from, to, scope } = params.data;

  // BOLA guard: staffId is ALWAYS sourced from the authenticated session —
  // never from query parameters. A staff member can only query their own records.
  const records = scope === "today"
    ? await fetchAttendanceRecords({ staffId: session.staff_id, from: to ?? from, to: to ?? from })
    : await fetchAttendanceRecords({ staffId: session.staff_id, from, to });

  return NextResponse.json({ records });
}

// ─── POST — clock-in / clock-out for the authenticated user only ──────────────
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "clock-in") {
    const record = await clockInAttendance({
      // BOLA guard: staffId, staffName, department, role all come from the
      // authenticated session — never from the request body. This prevents a
      // staff member from clocking in as a different employee.
      staffId:        session.staff_id,
      staffName:      session.full_name,
      department:     session.department,
      role:           session.role,
      attendanceDate: data.attendanceDate,
      clockInAt:      data.clockInAt,
      status:         data.status,
      unit:           data.unit ?? session.department,
    });

    if (!record) {
      return NextResponse.json({ error: "failed_to_clock_in" }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  }

  // clock-out
  // Fetch the existing record using session.staff_id — BOLA: the lookup is
  // always scoped to the authenticated user, not an attacker-supplied staffId.
  const existing = await fetchAttendanceRecord(session.staff_id, data.attendanceDate);
  if (!existing) {
    return NextResponse.json({ error: "record_not_found" }, { status: 404 });
  }

  if (existing.clockOutAt) {
    return NextResponse.json({ record: existing });
  }

  const record = await clockOutAttendance({
    staffId:        session.staff_id,
    attendanceDate: data.attendanceDate,
    clockOutAt:     data.clockOutAt,
  });

  if (!record) {
    return NextResponse.json({ error: "failed_to_clock_out" }, { status: 500 });
  }

  return NextResponse.json({ record });
}
