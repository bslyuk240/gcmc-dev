import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fetchAttendanceRecords } from "@/modules/workforce/attendance/service";

function canViewHrAttendance(role: string, department: string) {
  return department === "hr" || role === "admin";
}

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!canViewHrAttendance(session.role, session.department)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const department = url.searchParams.get("department") ?? undefined;

  const records = await fetchAttendanceRecords({ from, to, department });
  return NextResponse.json({ records });
}

