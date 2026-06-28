import { NextResponse } from "next/server";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { requireStoreSession } from "@/modules/store/access";
import { issueRequisition, listRequisitions } from "@/modules/store/requisitions/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStoreSession("fulfill");
    const { id } = await params;
    const body = await request.json();
    const result = await issueRequisition({
      requisitionId: id,
      issues: body.issues ?? [],
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

    const requisitionsAfterIssue = await listRequisitions();
    const issuedReq = requisitionsAfterIssue.find((r) => r.id === id);
    await notifyDepartmentWorkflow({
      toDepartments: [issuedReq?.department ?? "store"],
      subject: `Store issue recorded: ${id}`,
      title: "Store issue recorded",
      intro: `Store issued items for requisition ${id}.`,
      rows: [
        { label: "Requisition", value: id },
        { label: "Status", value: result.status },
        { label: "Issued by", value: session.full_name },
      ],
      href: "/app/store/requisitions",
    });

    const scoped = await createTenantAdminClient();
    if (scoped) {
      const requisitions = await listRequisitions();
      const req = requisitions.find((r) => r.id === id);
      if (req?.requisitionType === "pharmacy_restock") {
        for (const line of req.lines) {
          const issue = (body.issues as { lineId: string; qty: number }[]).find((i) => i.lineId === line.id);
          if (!issue?.qty || !line.pharmacyInventoryId) continue;
          const { data: inv } = await scoped.admin
            .from("pharmacy_inventory")
            .select("stock, reorder_level")
            .eq("id", line.pharmacyInventoryId)
            .maybeSingle();
          if (!inv) continue;
          const newStock = Math.max(0, Number(inv.stock) + issue.qty);
          const reorder = Number(inv.reorder_level);
          const status = newStock === 0 ? "out" : newStock <= reorder * 0.3 ? "critical" : newStock <= reorder ? "low" : "ok";
          await scoped.admin.from("pharmacy_inventory").update({ stock: newStock, status }).eq("id", line.pharmacyInventoryId);
          await scoped.admin.from("stock_movements").insert({
            hospital_id: scoped.hospitalId,
            inventory_id: line.pharmacyInventoryId,
            movement_type: "in",
            quantity: issue.qty,
            source_destination: `Store issue — ${line.itemName}`,
            ref_no: id,
            created_by: session.full_name,
          });
        }
        if (req.pharmacyRestockId) {
          await scoped.admin.from("pharmacy_restock_requests").update({
            status: result.status === "fulfilled" ? "Fulfilled" : "Approved",
            fulfilled_at: result.status === "fulfilled" ? new Date().toISOString() : null,
          }).eq("id", req.pharmacyRestockId);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Issue failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
