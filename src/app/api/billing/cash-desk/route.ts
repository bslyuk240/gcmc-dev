import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { getCashDeskQueue } from "@/modules/billing/ledger/service";

export async function GET(request: Request) {
  try {
    await requireBillingSession("view");
    const { searchParams } = new URL(request.url);
    const queue = await getCashDeskQueue({
      department: searchParams.get("department") ?? undefined,
      patientId: searchParams.get("patientId") ?? undefined,
    });
    return NextResponse.json(queue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load cash desk.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
