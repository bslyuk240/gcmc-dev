import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { isHrRole, requireStaffPortalSession } from "@/modules/staff-portal/access";
import {
  createStaffDocument,
  listMyDocuments,
  listStaffDocumentsForHr,
} from "@/modules/staff-portal/documents/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staffIdFilter = searchParams.get("staffId");

    const staffSession = await requireStaffPortalSession().catch(() => null);
    if (staffSession) {
      const documents = await listMyDocuments(staffSession.staff_id);
      return NextResponse.json({ documents });
    }

    const mgmt = await getServerSession();
    if (!mgmt || !isHrRole(mgmt)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await listStaffDocumentsForHr(staffIdFilter ?? undefined);
    return NextResponse.json({ documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load documents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const mgmt = await getServerSession();
    if (!mgmt || !isHrRole(mgmt)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = await createStaffDocument({
      staffId: String(body.staffId),
      title: String(body.title),
      category: String(body.category ?? "Other"),
      issuedOn: body.issuedOn != null ? String(body.issuedOn) : undefined,
      expiryDate: body.expiryDate != null ? String(body.expiryDate) : undefined,
      fileName: body.fileName != null ? String(body.fileName) : undefined,
      storagePath: body.storagePath != null ? String(body.storagePath) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      uploadedBy: mgmt.full_name,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ document: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
