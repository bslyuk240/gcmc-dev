import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { canViewBilling } from "@/modules/billing/access";
import { canViewNhis } from "@/modules/nhis/access";
import { applyHmoTariffToCharge, applyHmoToPatientCharges } from "@/modules/nhis/claims/service";

async function requireHmoPricingAccess() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  if (!canViewNhis(session) && !canViewBilling(session)) throw new Error("Forbidden");
  return session;
}

export async function POST(request: Request) {
  try {
    await requireHmoPricingAccess();
    const body = await request.json();

    if (body.chargeLineId) {
      const result = await applyHmoTariffToCharge(String(body.chargeLineId));
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (body.patientRef) {
      const result = await applyHmoToPatientCharges(String(body.patientRef));
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "chargeLineId or patientRef is required." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to apply HMO pricing.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
