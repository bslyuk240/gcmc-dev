import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { listGoodsReceipts, receiveGrn } from "@/modules/store/procurement/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    await requireStoreSession("view");
    const { searchParams } = new URL(request.url);
    const receipts = await listGoodsReceipts(searchParams.get("poId") ?? undefined);
    return NextResponse.json({ receipts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load GRNs.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStoreSession("procure");
    const body = await request.json();
    const result = await receiveGrn({
      poId: body.poId,
      lines: body.lines ?? [],
      notes: body.notes,
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["store", "accounts"],
      subject: `Goods received: ${result.grnNumber}`,
      title: "Goods received",
      intro: `${session.full_name} recorded goods received for a purchase order.`,
      rows: [
        { label: "GRN", value: result.grnNumber },
        { label: "PO", value: body.poId },
        { label: "PO status", value: result.poStatus },
      ],
      href: "/app/store/procurement/grn",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "GRN failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
