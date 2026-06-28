import { NextResponse } from "next/server";
import { requireStaffPortalSession } from "@/modules/staff-portal/access";
import { getStaffProfileDetails } from "@/modules/staff-portal/profile/service";

export async function GET() {
  try {
    const session = await requireStaffPortalSession();
    const profile = await getStaffProfileDetails(session.staff_id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile.";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
