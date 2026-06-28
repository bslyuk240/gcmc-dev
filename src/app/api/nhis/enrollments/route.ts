import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { canCreatePendingEnrollment, requireNhisSession } from "@/modules/nhis/access";
import {
  createHmoEnrollment,
  listHmoEnrollments,
  listPendingHmoRegistrations,
  updateHmoEnrollment,
} from "@/modules/nhis/enrollments/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    await requireNhisSession("view");
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "pending-registrations") {
      const registrations = await listPendingHmoRegistrations();
      return NextResponse.json({ registrations });
    }

    const enrollments = await listHmoEnrollments({
      verificationStatus: searchParams.get("verificationStatus") ?? undefined,
      schemeId: searchParams.get("schemeId") ?? undefined,
    });
    return NextResponse.json({ enrollments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load enrollments.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) throw new Error("Unauthorized");
    if (!canCreatePendingEnrollment(session)) throw new Error("Forbidden");

    const body = await request.json();
    const fromNhis = session.department === "nhis" || session.role === "admin";

    const result = await createHmoEnrollment({
      ...body,
      verifyImmediately: fromNhis ? body.verifyImmediately !== false : false,
      createdBy: session.auth_user_id ?? session.staff_id,
      createdByName: session.full_name,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis"],
      subject: `HMO enrollment created: ${result.patientName}`,
      title: "HMO enrollment created",
      intro: `${session.full_name} created an HMO enrollment.`,
      rows: [
        { label: "Patient", value: result.patientName },
        { label: "Scheme", value: result.schemeName },
        { label: "Status", value: result.verificationStatus },
      ],
      href: "/app/nhis/patients",
    });
    return NextResponse.json({ enrollment: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create enrollment.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireNhisSession("manage");
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
    const result = await updateHmoEnrollment(body.id, body);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis"],
      subject: `HMO enrollment updated: ${result.patientName}`,
      title: "HMO enrollment updated",
      intro: "An HMO enrollment record was updated.",
      rows: [
        { label: "Patient", value: result.patientName },
        { label: "Scheme", value: result.schemeName },
        { label: "Status", value: result.verificationStatus },
      ],
      href: "/app/nhis/patients",
    });
    return NextResponse.json({ enrollment: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update enrollment.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
