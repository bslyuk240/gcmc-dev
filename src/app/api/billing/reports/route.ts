import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { getBillingReportSummary } from "@/modules/billing/reports/service";

export async function GET(request: Request) {
  try {
    await requireBillingSession("view");
    const { searchParams } = new URL(request.url);
    const summary = await getBillingReportSummary({
      start: searchParams.get("start") ?? undefined,
      end: searchParams.get("end") ?? undefined,
    });
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load report.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
