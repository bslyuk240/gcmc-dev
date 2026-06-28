import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { appConfig } from "@/lib/config/app";
import { updateHospitalSettingsAction } from "@/server/actions/admin/update-hospital-settings";

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

function guessLogoExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/svg+xml") return "svg";
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

  const formData = await request.formData();
  const fileValue = formData.get("logo");

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(fileValue.type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  if (fileValue.size > MAX_LOGO_SIZE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  const bucketName = appConfig.publicBucketName;
  const ext = guessLogoExtension(fileValue);
  const path = `${hospitalId}/branding/logo.${ext}`;
  const bytes = Buffer.from(await fileValue.arrayBuffer());

  const bucket = admin.storage.from(bucketName);
  let { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: fileValue.type,
    upsert: true,
  });

  if (uploadError && isMissingBucketError(uploadError.message)) {
    const storage = admin.storage as unknown as {
      createBucket?: (name: string, options?: { public?: boolean }) => Promise<{ error: { message: string } | null }>;
    };
    await storage.createBucket?.(bucketName, { public: true });
    ({ error: uploadError } = await bucket.upload(path, bytes, {
      contentType: fileValue.type,
      upsert: true,
    }));
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(bucketName).getPublicUrl(path);
  const logoUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const result = await updateHospitalSettingsAction({
    settings: { logo_url: logoUrl },
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ logoUrl, branding: result.branding });
}
