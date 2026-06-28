import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { isHrRole } from "@/modules/staff-portal/access";
import { uploadStaffDocumentFile } from "@/modules/staff-portal/documents/storage";

export async function POST(request: Request) {
  try {
    const mgmt = await getServerSession();
    if (!mgmt || !isHrRole(mgmt)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const staffId = String(form.get("staffId") ?? "");
    const file = form.get("file");

    if (!staffId || !(file instanceof File)) {
      return NextResponse.json({ error: "staffId and file are required." }, { status: 400 });
    }

    const result = await uploadStaffDocumentFile({
      staffId,
      fileName: file.name,
      bytes: await file.arrayBuffer(),
      contentType: file.type || "application/octet-stream",
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
