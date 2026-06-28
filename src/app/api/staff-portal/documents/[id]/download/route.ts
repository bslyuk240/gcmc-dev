import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { isHrRole, requireStaffPortalSession } from "@/modules/staff-portal/access";
import {
  createDocumentSignedUrl,
  getStaffDocumentById,
} from "@/modules/staff-portal/documents/storage";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const doc = await getStaffDocumentById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const staffSession = await requireStaffPortalSession().catch(() => null);
    const mgmt = staffSession ? null : await getServerSession();

    const isOwner = staffSession?.staff_id === String(doc.staff_id);
    const isHr = mgmt ? isHrRole(mgmt) : false;

    if (!isOwner && !isHr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isOwner && doc.visible_to_staff === false) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const storagePath = doc.storage_path != null ? String(doc.storage_path) : "";
    if (!storagePath) {
      return NextResponse.json({ error: "No file attached to this document." }, { status: 404 });
    }

    const url = await createDocumentSignedUrl(storagePath);
    if (!url) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
