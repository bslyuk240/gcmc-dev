import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { appConfig } from "@/lib/config/app";
import { updateHospitalSettingsAction } from "@/server/actions/admin/update-hospital-settings";
import {
  validateMimeType,
  validateContentLength,
  validateBufferSize,
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_BYTES,
} from "@/lib/security/file-validation";

function extensionFromMime(mime: string): string {
  if (mime === "image/png")      return "png";
  if (mime === "image/webp")     return "webp";
  if (mime === "image/svg+xml")  return "svg";
  return "jpg";
}

function isMissingBucketError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("bucket not found") || (lower.includes("bucket") && lower.includes("not found"));
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Early Content-Length guard ────────────────────────────────────────────
  const lengthCheck = validateContentLength(request, MAX_LOGO_BYTES);
  if (!lengthCheck.ok) {
    return NextResponse.json({ error: lengthCheck.error }, { status: lengthCheck.status });
  }

  const formData = await request.formData();
  const fileValue = formData.get("logo");

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // ── Read bytes once ───────────────────────────────────────────────────────
  const arrayBuf = await fileValue.arrayBuffer();
  const bytes    = Buffer.from(arrayBuf);

  // ── Actual buffer size check ──────────────────────────────────────────────
  const sizeCheck = validateBufferSize(arrayBuf, MAX_LOGO_BYTES);
  if (!sizeCheck.ok) {
    return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status });
  }

  // ── Magic-byte MIME detection (SVG allowed via text-based check) ──────────
  const mimeCheck = await validateMimeType(bytes, ALLOWED_LOGO_MIME_TYPES, /* allowSvg */ true);
  if (!mimeCheck.ok) {
    return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  const bucketName = appConfig.publicBucketName;
  // Extension and contentType are derived from the verified MIME type.
  const ext  = extensionFromMime(mimeCheck.mimeType);
  const path = `${hospitalId}/branding/logo.${ext}`;

  const bucket = admin.storage.from(bucketName);
  let { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: mimeCheck.mimeType,
    upsert: true,
  });

  if (uploadError && isMissingBucketError(uploadError.message)) {
    const storage = admin.storage as unknown as {
      createBucket?: (name: string, options?: { public?: boolean }) => Promise<{ error: { message: string } | null }>;
    };
    await storage.createBucket?.(bucketName, { public: true });
    ({ error: uploadError } = await bucket.upload(path, bytes, {
      contentType: mimeCheck.mimeType,
      upsert: true,
    }));
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(bucketName).getPublicUrl(path);
  const logoUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const result = await updateHospitalSettingsAction({ settings: { logo_url: logoUrl } });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ logoUrl, branding: result.branding });
}
