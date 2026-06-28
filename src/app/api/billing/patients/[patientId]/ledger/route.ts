import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { getPatientLedger } from "@/modules/billing/ledger/service";

type RouteContext = { params: Promise<{ patientId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireBillingSession("view");
    const { patientId } = await context.params;
    const ledger = await getPatientLedger(decodeURIComponent(patientId));
    if (!ledger) {
      return NextResponse.json({ error: "Patient ledger not found." }, { status: 404 });
    }
    return NextResponse.json({ ledger });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ledger.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
