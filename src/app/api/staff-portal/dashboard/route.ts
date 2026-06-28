import { NextResponse } from "next/server";
import { requireStaffPortalSession } from "@/modules/staff-portal/access";
import { getStaffDashboard } from "@/modules/staff-portal/dashboard/service";

export async function GET() {
  try {
    const session = await requireStaffPortalSession();
    if (!session.hospital_id) {
      return NextResponse.json({ error: "Hospital context missing." }, { status: 400 });
    }

    const dashboard = await getStaffDashboard({
      hospitalId: session.hospital_id,
      staffId: session.staff_id,
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
