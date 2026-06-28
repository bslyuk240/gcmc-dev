import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { closeBusinessDay, getDayClosureSummary } from "@/modules/billing/day-close/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    await requireBillingSession("view");
    const { searchParams } = new URL(request.url);
    const summary = await getDayClosureSummary(searchParams.get("date") ?? undefined);
    return NextResponse.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load day close.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBillingSession("close");
    const body = await request.json().catch(() => null);
    if (body?.countedCash == null || Number.isNaN(Number(body.countedCash))) {
      return NextResponse.json({ error: "countedCash is required." }, { status: 400 });
    }

    const result = await closeBusinessDay({
      businessDate: body.businessDate != null ? String(body.businessDate) : undefined,
      countedCash: Number(body.countedCash),
      closedBy: session.auth_user_id ?? session.staff_id,
      closedByName: session.full_name,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await notifyDepartmentWorkflow({
      toDepartments: ["accounts", "admin"],
      subject: `Business day closed: ${result.businessDate}`,
      title: "Business day closed",
      intro: `${session.full_name} closed the business day.`,
      rows: [
        { label: "Business date", value: result.businessDate },
        { label: "Collected", value: result.collectedToday },
        { label: "Expected cash", value: result.expectedCash },
        { label: "Counted cash", value: result.countedCash },
        { label: "Variance", value: result.variance },
      ],
      href: "/app/accounts/day-close",
    });

    return NextResponse.json({ summary: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Day close failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
