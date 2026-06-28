import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { getNhisDashboard } from "@/modules/nhis/reports/service";

export async function GET() {
  try {
    await requireNhisSession("view");
    const summary = await getNhisDashboard();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
