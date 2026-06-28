import { NextResponse } from "next/server";
import {
  createCatalogFromRequisitionLine,
  linkRequisitionLine,
  markRequisitionLineProcurement,
} from "@/modules/store/requisitions/service";
import { requireStoreSession } from "@/modules/store/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lineId: string }> },
) {
  try {
    const session = await requireStoreSession("fulfill");
    const { lineId } = await params;
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "link") {
      const result = await linkRequisitionLine({ lineId, itemId: String(body.itemId ?? "") });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === "create_catalog") {
      const result = await createCatalogFromRequisitionLine({
        lineId,
        category: body.category ? String(body.category) : undefined,
        reorderLevel: body.reorderLevel != null ? Number(body.reorderLevel) : undefined,
        unitCost: body.unitCost != null ? Number(body.unitCost) : undefined,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    if (action === "procure") {
      const result = await markRequisitionLineProcurement({
        lineId,
        requisitionId: String(body.requisitionId ?? ""),
        createPo: Boolean(body.createPo),
        actorName: session.full_name,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Line action failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
