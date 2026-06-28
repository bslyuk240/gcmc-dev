import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { listStoreItems, upsertStoreItem, adjustStoreItemStock } from "@/modules/store/inventory/service";

export async function GET() {
  try {
    await requireStoreSession("view");
    const items = await listStoreItems();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load items.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireStoreSession("fulfill");
    const body = await request.json();
    const result = await upsertStoreItem(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ item: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save item.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireStoreSession("fulfill");
    const body = await request.json();
    const result = await adjustStoreItemStock({
      itemId: body.itemId,
      qtyDelta: Number(body.qtyDelta),
      notes: body.notes,
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adjustment failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
