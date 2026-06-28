import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { createSupplier, deleteSupplier, listSuppliers } from "@/modules/store/procurement/service";

export async function GET() {
  try {
    await requireStoreSession("view");
    const suppliers = await listSuppliers();
    return NextResponse.json({ suppliers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load suppliers.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireStoreSession("procure");
    const body = await request.json();
    const result = await createSupplier(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ supplier: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create supplier.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireStoreSession("procure");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const result = await deleteSupplier(id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete supplier.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
