import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { verifyHmoEnrollment } from "@/modules/nhis/enrollments/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireNhisSession("manage");
    const { id } = await params;
    const body = await request.json();

    const result = await verifyHmoEnrollment({
      id,
      action: body.action,
      actorId: session.auth_user_id ?? session.staff_id,
      actorName: session.full_name,
      rejectionReason: body.rejectionReason,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis", "accounts"],
      subject: `HMO enrollment ${result.verificationStatus}: ${result.patientName}`,
      title: "HMO enrollment reviewed",
      intro: `${session.full_name} reviewed an HMO enrollment.`,
      rows: [
        { label: "Patient", value: result.patientName },
        { label: "Scheme", value: result.schemeName },
        { label: "Status", value: result.verificationStatus },
      ],
      href: "/app/nhis/patients",
    });
    return NextResponse.json({ enrollment: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
