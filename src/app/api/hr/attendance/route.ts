import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth/session";
import { fetchAttendanceRecords } from "@/modules/workforce/attendance/service";

// ─── Input schema ──────────────────────────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Allowlist of department slugs to prevent open-ended DB probing via the
// `department` filter. Must stay in sync with the department_key enum.
const VALID_DEPARTMENTS = [
  "admin", "doctors", "nurses", "pharmacy", "laboratory", "radiology",
  "accounts", "hr", "it", "security", "store", "front_desk",
  "physiotherapy", "records",
] as const;

const GetSchema = z.object({
  from:       z.string().regex(DATE_RE, "Invalid date format").optional(),
  to:         z.string().regex(DATE_RE, "Invalid date format").optional(),
  department: z.enum(VALID_DEPARTMENTS).optional(),
});

// ─── Authorization predicate ───────────────────────────────────────────────────
function canViewHrAttendance(role: string, department: string): boolean {
  return department === "hr" || role === "admin";
}

// ─── GET /api/hr/attendance — HR / admin cross-department view ────────────────
export async function GET(request: Request) {
  // 1. Authenticate via session JWT
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 2. Authorize — only HR staff and admins can view cross-department records
  if (!canViewHrAttendance(session.role, session.department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 3. Validate and sanitize query parameters with Zod
  const url    = new URL(request.url);
  const params = GetSchema.safeParse({
    from:       url.searchParams.get("from")       ?? undefined,
    to:         url.searchParams.get("to")         ?? undefined,
    department: url.searchParams.get("department") ?? undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const { from, to, department } = params.data;

  // 4. Query — no staffId filter here (HR views all staff in their hospital).
  //    The service uses createTenantAdminClient() which is already scoped to
  //    session.hospital_id, preventing cross-tenant data access.
  const records = await fetchAttendanceRecords({ from, to, department });
  return NextResponse.json({ records });
}
