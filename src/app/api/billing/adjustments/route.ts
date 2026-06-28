import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { waiveBillingCharge } from "@/modules/billing/payments/service";

export async function POST(request: Request) {
  try {
    const session = await requireBillingSession("adjust");
    const body = await request.json().catch(() => null);
    if (!body?.chargeLineId || !body?.reason) {
      return NextResponse.json({ error: "chargeLineId and reason are required." }, { status: 400 });
    }

    const result = await waiveBillingCharge({
      chargeLineId: String(body.chargeLineId),
      reason: String(body.reason),
      approvedBy: session.auth_user_id ?? session.staff_id,
      approvedByName: session.full_name,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adjustment failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
