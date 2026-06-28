import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { canRequestPreauth, canViewNhis, requireNhisSession, requirePreauthRequestSession } from "@/modules/nhis/access";
import {
  checkPreauthStatus,
  createPreauthorization,
  listPreauthorizations,
} from "@/modules/nhis/preauth/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) throw new Error("Unauthorized");

    const { searchParams } = new URL(request.url);
    const check = searchParams.get("check");

    if (check === "status") {
      if (!canViewNhis(session) && !canRequestPreauth(session)) {
        throw new Error("Forbidden");
      }
      const patientRef = searchParams.get("patientRef");
      const category = searchParams.get("category");
      if (!patientRef || !category) {
        return NextResponse.json({ error: "patientRef and category are required." }, { status: 400 });
      }
      const status = await checkPreauthStatus({
        patientRef,
        serviceCategory: category as "admission" | "procedure",
      });
      return NextResponse.json(status);
    }

    await requireNhisSession("view");
    const preauths = await listPreauthorizations({
      status: searchParams.get("status") ?? undefined,
      schemeId: searchParams.get("schemeId") ?? undefined,
    });
    return NextResponse.json({ preauths });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load pre-authorizations.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePreauthRequestSession();
    const body = await request.json();

    const result = await createPreauthorization({
      patientRef: String(body.patientRef),
      patientName: String(body.patientName),
      serviceCategory: body.serviceCategory,
      serviceName: String(body.serviceName),
      amountCap: body.amountCap != null ? Number(body.amountCap) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      referenceType: body.referenceType != null ? String(body.referenceType) : undefined,
      referenceId: body.referenceId != null ? String(body.referenceId) : undefined,
      requestedBy: session.auth_user_id ?? session.staff_id,
      requestedByName: session.full_name,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis"],
      subject: `Pre-authorization requested: ${result.patientName}`,
      title: "Pre-authorization requested",
      intro: `${session.full_name} requested NHIS/HMO pre-authorization.`,
      rows: [
        { label: "Patient", value: result.patientName },
        { label: "Service", value: result.serviceName },
        { label: "Status", value: result.status },
      ],
      href: "/app/nhis/preauth",
    });
    return NextResponse.json({ preauth: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create pre-authorization.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
