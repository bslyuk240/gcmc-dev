import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { listHmoRemittances, postHmoRemittance } from "@/modules/nhis/remittances/service";

export async function GET() {
  try {
    await requireNhisSession("view");
    const remittances = await listHmoRemittances();
    return NextResponse.json({ remittances });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load remittances.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireNhisSession("approve");
    const body = await request.json();

    const result = await postHmoRemittance({
      schemeId: body.schemeId,
      remittanceRef: body.remittanceRef,
      amount: Number(body.amount),
      receivedAt: body.receivedAt,
      bankReference: body.bankReference,
      notes: body.notes,
      recordedBy: session.auth_user_id ?? session.staff_id,
      recordedByName: session.full_name,
      allocations: body.allocations ?? [],
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post remittance.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
