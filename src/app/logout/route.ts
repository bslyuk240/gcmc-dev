import { NextResponse } from "next/server";
import {
  clearSessionCookies,
  getServerSession,
  getStaffPortalSession,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { auditIpFromRequest, auditUserAgentFromRequest, logAuditEvent } from "@/lib/audit/log-event";
import { clearPlatformTenantSession } from "@/lib/platform/clear-tenant-session";

export async function POST(request: Request) {
  const mgmtSession = await getServerSession();
  const staffSession = await getStaffPortalSession();
  const session = mgmtSession ?? staffSession;

  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await clearPlatformTenantSession(user.id);
    }
    await supabase.auth.signOut();
  }

  if (session) {
    await logAuditEvent({
      action: mgmtSession ? "auth.management.logout" : "auth.staff.logout",
      portal: mgmtSession ? "management" : "staff",
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

  return NextResponse.redirect(new URL("/login", request.url), 303);
}
