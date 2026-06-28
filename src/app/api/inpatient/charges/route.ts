import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  canManageInpatientBilling,
  canRecordInpatientCharges,
  canViewInpatientBilling,
} from "@/lib/inpatient/access";
import {
  addInpatientCharge,
  listInpatientCharges,
  updateInpatientChargeStatus,
} from "@/lib/inpatient/service";
import type { ChargeStatus } from "@/lib/inpatient/types";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session || !canViewInpatientBilling(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stayId = new URL(request.url).searchParams.get("stayId");
  if (!stayId) return NextResponse.json({ error: "stayId is required." }, { status: 400 });

  const charges = await listInpatientCharges(stayId);
  return NextResponse.json({ charges });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || !canRecordInpatientCharges(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.stayId || !body?.description) {
    return NextResponse.json({ error: "stayId and description are required." }, { status: 400 });
  }

  const quantity = Number(body.quantity ?? 1);
  const unitAmount = Number(body.unitAmount ?? 0);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be greater than zero." }, { status: 400 });
  }
  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    return NextResponse.json({ error: "unitAmount must be zero or greater." }, { status: 400 });
  }

  const result = await addInpatientCharge({
    stayId: String(body.stayId),
    chargeType: body.chargeType === "bed_day" ? "bed_day" : "consumable",
    description: String(body.description),
    quantity,
    unitAmount,
    recordedBy: session.full_name,
    chargeDate: body.chargeDate != null ? String(body.chargeDate) : undefined,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ charge: result.charge }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session || !canManageInpatientBilling(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.chargeId || !body?.status) {
    return NextResponse.json({ error: "chargeId and status are required." }, { status: 400 });
  }

  const allowed: ChargeStatus[] = ["Pending", "Billed", "Paid", "Waived"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const result = await updateInpatientChargeStatus({
    chargeId: String(body.chargeId),
    status: body.status as ChargeStatus,
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ charge: result.charge });
}
