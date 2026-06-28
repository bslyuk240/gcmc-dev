import { NextResponse } from "next/server";
import { requireStoreSession } from "@/modules/store/access";
import { createPurchaseOrder, listPurchaseOrders } from "@/modules/store/procurement/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET() {
  try {
    await requireStoreSession("view");
    const orders = await listPurchaseOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load orders.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStoreSession("procure");
    const body = await request.json();
    const result = await createPurchaseOrder(body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["store", "accounts"],
      subject: `Purchase order created: ${result.id}`,
      title: "Purchase order created",
      intro: `${session.full_name} created a purchase order.`,
      rows: [
        { label: "PO", value: result.id },
        { label: "Supplier", value: result.supplier },
        { label: "Requested by", value: result.requestedBy },
        { label: "Status", value: result.status },
      ],
      href: "/app/store/procurement",
    });
    return NextResponse.json({ order: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create PO.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
