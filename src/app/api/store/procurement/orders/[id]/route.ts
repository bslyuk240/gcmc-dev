import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import {
  markPOPaymentSubmitted,
  updatePurchaseOrderStatus,
} from "@/modules/store/procurement/service";
import type { POStatus } from "@/modules/store/types";
import { addSupplierPayment } from "@/lib/data/accounts-store";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = await request.json();
    const isApproval = body.status === "approved" || body.status === "rejected" || body.status === "pending_approval";
    const session = await requireStoreSession(isApproval ? "approve" : "procure");
    const { id } = await params;
    const result = await updatePurchaseOrderStatus({
      poId: id,
      status: body.status as POStatus,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["store", "accounts"],
      subject: `Purchase order ${result.status}: ${result.poId}`,
      title: "Purchase order updated",
      intro: `${session.full_name} updated purchase order ${result.poId}.`,
      rows: [
        { label: "PO", value: result.poId },
        { label: "Status", value: result.status },
      ],
      href: "/app/store/procurement",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update PO.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStoreSession("procure");
    const { id } = await params;
    const body = await request.json();

    if (body.action === "submit_payment") {
      await markPOPaymentSubmitted(id);
      const amount = Number(body.amount ?? 0);
      const supplier = String(body.supplier ?? "Supplier");
      if (amount > 0) {
        addSupplierPayment({
          id: `SP-${id}-${Date.now()}`,
          poId: id,
          supplier,
          amount,
          description: `Payment for PO ${id}`,
          items: 1,
          submittedBy: session.full_name,
          submittedAt: new Date().toISOString(),
          dueDate: new Date().toISOString().slice(0, 10),
          status: "Pending",
        });
      }
      await notifyDepartmentWorkflow({
        toDepartments: ["accounts"],
        subject: `Supplier payment submitted: ${id}`,
        title: "Supplier payment submitted",
        intro: `${session.full_name} submitted a supplier payment request.`,
        rows: [
          { label: "PO", value: id },
          { label: "Supplier", value: body.supplier },
          { label: "Amount", value: body.amount },
        ],
        href: "/app/accounts/supplier-payments",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PO action failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
