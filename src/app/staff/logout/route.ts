import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  getStaffPortalSession,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { auditIpFromRequest, auditUserAgentFromRequest, logAuditEvent } from "@/lib/audit/log-event";

export async function POST(request: Request) {
  const session = await getStaffPortalSession();

  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  if (session) {
    await logAuditEvent({
      action: "auth.staff.logout",
      portal: "staff",
      actorId: session.staff_id,
      actorName: session.full_name,
      hospitalId: session.hospital_id,
      department: session.department,
      ipAddress: auditIpFromRequest(request),
      userAgent: auditUserAgentFromRequest(request),
      payload: { role: session.role, hospital_slug: session.hospital_slug },
    });
  }

  await clearSessionCookies();

  return NextResponse.redirect(new URL("/staff/login", request.url), 303);
}
