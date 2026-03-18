import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

/**
 * GET /app/my-profile
 * Legacy alias for the staff portal entry point.
 * Does NOT bridge management auth into the staff portal cookie.
 */
export async function GET(request: NextRequest) {
  const base = new URL(request.url).origin;
  const session = await getServerSession();

  if (!session) {
    return NextResponse.redirect(`${base}/login`);
  }

  return NextResponse.redirect(`${base}/staff/login?next=/staff/dashboard`);
}
