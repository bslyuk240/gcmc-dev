import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { reviewPreauthorization } from "@/modules/nhis/preauth/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireNhisSession("manage");
    const { id } = await params;
    const body = await request.json();

    const result = await reviewPreauthorization({
      id,
      action: body.action,
      reviewerId: session.auth_user_id ?? session.staff_id,
      reviewerName: session.full_name,
      authCode: body.authCode != null ? String(body.authCode) : undefined,
      validUntil: body.validUntil != null ? String(body.validUntil) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis", "accounts"],
      subject: `Pre-authorization ${result.status}: ${result.preauthId}`,
      title: "Pre-authorization reviewed",
      intro: `${session.full_name} reviewed an NHIS/HMO pre-authorization request.`,
      rows: [
        { label: "Pre-auth", value: result.preauthId },
        { label: "Status", value: result.status },
      ],
      href: "/app/nhis/preauth",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
