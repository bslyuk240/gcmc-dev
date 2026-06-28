import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { deleteHmoTariff, listHmoTariffs, upsertHmoTariff } from "@/modules/nhis/tariffs/service";

export async function GET(request: Request) {
  try {
    await requireNhisSession("view");
    const { searchParams } = new URL(request.url);
    const tariffs = await listHmoTariffs(searchParams.get("schemeId") ?? undefined);
    return NextResponse.json({ tariffs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load tariffs.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireNhisSession("manage");
    const body = await request.json();
    const result = await upsertHmoTariff(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ tariff: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save tariff.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireNhisSession("manage");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const result = await deleteHmoTariff(id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete tariff.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
