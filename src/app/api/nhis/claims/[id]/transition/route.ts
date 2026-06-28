import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { transitionHmoClaim } from "@/modules/nhis/claims/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireNhisSession("submit");
    const { id } = await params;
    const body = await request.json();

    const action = body.action as "submit" | "approve" | "reject" | "mark_paid" | "mark_partial";
    if (["approve", "reject"].includes(action)) {
      await requireNhisSession("approve");
    }

    const result = await transitionHmoClaim({
      claimId: id,
      action,
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
      rejectionReason: body.rejectionReason,
      amountPaid: body.amountPaid != null ? Number(body.amountPaid) : undefined,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis", "accounts"],
      subject: `HMO claim ${result.status}: ${result.claimId}`,
      title: "HMO claim updated",
      intro: `${session.full_name} updated an HMO claim.`,
      rows: [
        { label: "Claim", value: result.claimId },
        { label: "Status", value: result.status },
        { label: "Action", value: action },
      ],
      href: "/app/nhis/claims",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claim transition failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
