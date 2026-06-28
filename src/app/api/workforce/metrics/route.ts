import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { fetchMyNcUnit } from "@/lib/supabase/db";
import {
  isWorkforceAdmin,
  isWorkforceUnitHod,
} from "@/lib/workforce/access";
import {
  getWorkforceMetrics,
  getWorkforceOverviewAllUnits,
} from "@/modules/workforce/metrics/service";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const overview = searchParams.get("overview") === "1";
  const unitNameParam = searchParams.get("unitName") ?? undefined;

  if (overview) {
    if (!isWorkforceAdmin(session) && session.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const units = await getWorkforceOverviewAllUnits();
    return NextResponse.json({ units });
  }

  let unitName = unitNameParam;
  if (isWorkforceUnitHod(session) && !isWorkforceAdmin(session)) {
    unitName = (await fetchMyNcUnit(session.staff_id)) ?? undefined;
  }

  const metrics = await getWorkforceMetrics(unitName);
  return NextResponse.json({ metrics, unitName: unitName ?? null });
}
