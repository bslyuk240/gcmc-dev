import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { listRequisitions, updateRequisitionStatus } from "@/modules/store/requisitions/service";
import type { RequisitionStatus } from "@/modules/store/types";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStoreSession("fulfill");
    const { id } = await params;
    const body = await request.json();
    const result = await updateRequisitionStatus({
      requisitionId: id,
      status: body.status as RequisitionStatus,
      notes: body.notes,
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    const requisitions = await listRequisitions();
    const requisition = requisitions.find((row) => row.id === id);
    await notifyDepartmentWorkflow({
      toDepartments: [requisition?.department ?? "store"],
      subject: `Store requisition ${result.status}: ${result.requisitionId}`,
      title: "Store requisition updated",
      intro: `Store updated requisition ${result.requisitionId}.`,
      rows: [
        { label: "Requisition", value: result.requisitionId },
        { label: "Status", value: result.status },
        { label: "Updated by", value: session.full_name },
      ],
      href: "/app/store/requisitions",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update requisition.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
