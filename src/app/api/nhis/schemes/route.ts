import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { listHmoSchemes, upsertHmoScheme } from "@/modules/nhis/schemes/service";

export async function GET() {
  try {
    await requireNhisSession("view");
    const schemes = await listHmoSchemes();
    return NextResponse.json({ schemes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load schemes.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireNhisSession("manage");
    const body = await request.json();
    const result = await upsertHmoScheme(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ scheme: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save scheme.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
