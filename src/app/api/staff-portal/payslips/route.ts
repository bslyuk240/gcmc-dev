import { NextResponse } from "next/server";
import { requireStaffPortalSession } from "@/modules/staff-portal/access";
import { listMyPayslips } from "@/modules/staff-portal/payslips/service";

export async function GET() {
  try {
    const session = await requireStaffPortalSession();
    const payslips = await listMyPayslips(session.staff_id);
    return NextResponse.json({ payslips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payslips.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
