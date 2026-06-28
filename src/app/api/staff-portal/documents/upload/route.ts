import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { isHrRole } from "@/modules/staff-portal/access";
import { uploadStaffDocumentFile } from "@/modules/staff-portal/documents/storage";
import {
  validateMimeType,
  validateContentLength,
  validateBufferSize,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_BYTES,
} from "@/lib/security/file-validation";

export async function POST(request: Request) {
  try {
    const mgmt = await getServerSession();
    if (!mgmt || !isHrRole(mgmt)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lengthCheck = validateContentLength(request, MAX_DOCUMENT_BYTES);
    if (!lengthCheck.ok) {
      return NextResponse.json({ error: lengthCheck.error }, { status: lengthCheck.status });
    }

    const form = await request.formData();
    const staffId = String(form.get("staffId") ?? "");
    const file = form.get("file");

    if (!staffId || !(file instanceof File)) {
      return NextResponse.json({ error: "staffId and file are required." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const sizeCheck = validateBufferSize(bytes, MAX_DOCUMENT_BYTES);
    if (!sizeCheck.ok) {
      return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status });
    }

    const mimeCheck = await validateMimeType(
      Buffer.from(bytes),
      ALLOWED_DOCUMENT_MIME_TYPES,
    );
    if (!mimeCheck.ok) {
      return NextResponse.json({ error: "Invalid file type." }, { status: 415 });
    }

    const result = await uploadStaffDocumentFile({
      staffId,
      fileName: file.name,
      bytes,
      // Use the server-verified MIME type, not the client-supplied one.
      contentType: mimeCheck.mimeType,
    });

    if ("error" in result) {
      return NextResponse.json({ error: "Upload failed." }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
