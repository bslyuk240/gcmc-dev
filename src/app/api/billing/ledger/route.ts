import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { getBillingLedger } from "@/modules/billing/ledger/service";

export async function GET(request: Request) {
  try {
    await requireBillingSession("view");
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") ?? undefined;
    const end = searchParams.get("end") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const entries = await getBillingLedger({ start, end, limit });
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ledger.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
