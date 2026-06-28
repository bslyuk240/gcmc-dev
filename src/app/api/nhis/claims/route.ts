import { NextResponse } from "next/server";
import { requireNhisSession } from "@/modules/nhis/access";
import { buildHmoClaim, listHmoClaims, listUnclaimedHmoCharges } from "@/modules/nhis/claims/service";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function GET(request: Request) {
  try {
    await requireNhisSession("view");
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    if (view === "unclaimed-charges") {
      const charges = await listUnclaimedHmoCharges(searchParams.get("patientId") ?? undefined);
      return NextResponse.json({ charges });
    }

    const claims = await listHmoClaims({
      status: searchParams.get("status") ?? undefined,
      schemeId: searchParams.get("schemeId") ?? undefined,
    });
    return NextResponse.json({ claims });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load claims.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireNhisSession("submit");
    const body = await request.json();

    const result = await buildHmoClaim({
      patientRef: body.patientRef,
      enrollmentId: body.enrollmentId,
      chargeLineIds: body.chargeLineIds,
      notes: body.notes,
      createdBy: session.auth_user_id ?? session.staff_id,
      createdByName: session.full_name,
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    await notifyDepartmentWorkflow({
      toDepartments: ["nhis", "accounts"],
      subject: `HMO claim created: ${result.claimNumber}`,
      title: "HMO claim created",
      intro: `${session.full_name} created an HMO claim.`,
      rows: [
        { label: "Claim", value: result.claimNumber },
        { label: "Patient reference", value: body.patientRef },
      ],
      href: "/app/nhis/claims",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build claim.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
