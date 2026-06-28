import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { getStoreDashboard } from "@/modules/store/reports/service";

export async function GET() {
  try {
    await requireStoreSession("view");
    const summary = await getStoreDashboard();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
