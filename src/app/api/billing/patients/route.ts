import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { searchPatientsWithOpenBalance } from "@/modules/billing/ledger/service";

export async function GET(request: Request) {
  try {
    await requireBillingSession("view");
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const patients = await searchPatientsWithOpenBalance(q);
    return NextResponse.json({ patients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
