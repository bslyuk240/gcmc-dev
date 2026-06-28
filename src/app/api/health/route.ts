import { NextResponse } from "next/server";

/**
 * Public health-check endpoint consumed by uptime monitors and load balancers.
 *
 * Returns only a minimal status indicator — no app name, no env variable
 * names, no timestamps, no diagnostic metadata that could assist reconnaissance.
 */
export function GET() {
  return NextResponse.json({ status: "healthy" }, { status: 200 });
}
