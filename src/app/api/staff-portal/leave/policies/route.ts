import { NextResponse } from "next/server";
import { requireStaffPortalSession } from "@/modules/staff-portal/access";
import { listLeavePolicies } from "@/modules/staff-portal/leave/service";

export async function GET() {
  try {
    await requireStaffPortalSession();
    const policies = await listLeavePolicies();
    return NextResponse.json({ policies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load leave policies.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
