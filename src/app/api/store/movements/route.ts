import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { listStoreMovements } from "@/modules/store/movements/service";

export async function GET(request: Request) {
  try {
    await requireStoreSession("view");
    const { searchParams } = new URL(request.url);
    const movements = await listStoreMovements({
      itemId: searchParams.get("itemId") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 100),
    });
    return NextResponse.json({ movements });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load movements.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
