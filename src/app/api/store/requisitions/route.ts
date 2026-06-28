import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { listRequisitions, submitRequisition } from "@/modules/store/requisitions/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    await requireStoreSession("view");
    const { searchParams } = new URL(request.url);
    const requisitions = await listRequisitions({
      department: searchParams.get("department") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });
    return NextResponse.json({ requisitions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load requisitions.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireStoreSession("view");
    const body = await request.json();
    const result = await submitRequisition(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["store"],
      subject: `Store requisition submitted: ${result.id}`,
      title: "Store requisition submitted",
      intro: `${result.department} submitted a store requisition.`,
      rows: [
        { label: "Requisition", value: result.id },
        { label: "Department", value: result.department },
        { label: "Urgency", value: result.urgency },
        { label: "Requested by", value: result.requestedBy },
      ],
      href: "/app/store/requisitions",
    });
    return NextResponse.json({ requisition: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit requisition.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
