import { NextResponse } from "next/server";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import {
  getStaffPortalSession,
  syncStaffAvatarAcrossSessions,
} from "@/lib/auth/session";
import {
  validateMimeType,
  validateContentLength,
  validateBufferSize,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/security/file-validation";

const STAFF_AVATAR_BUCKET = "staff-avatars";

/** Map verified server-side MIME type to a safe file extension. */
function extensionFromMime(mime: string): string {
  if (mime === "image/png")  return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif")  return "gif";
  return "jpg";
}

function isMissingBucketError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("bucket not found") || (lower.includes("bucket") && lower.includes("not found"));
}

function isMissingAvatarColumnError(message: string) {
  return message.toLowerCase().includes("column avatar_url does not exist");
}

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Early Content-Length guard ────────────────────────────────────────────
  const lengthCheck = validateContentLength(request, MAX_AVATAR_BYTES);
  if (!lengthCheck.ok) {
    return NextResponse.json({ error: lengthCheck.error }, { status: lengthCheck.status });
  }

  const formData = await request.formData();
  const fileValue = formData.get("avatar");

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  // ── Read bytes once ───────────────────────────────────────────────────────
  const arrayBuf = await fileValue.arrayBuffer();
  const bytes    = Buffer.from(arrayBuf);

  // ── Actual buffer size check ──────────────────────────────────────────────
  const sizeCheck = validateBufferSize(arrayBuf, MAX_AVATAR_BYTES);
  if (!sizeCheck.ok) {
    return NextResponse.json({ error: sizeCheck.error }, { status: sizeCheck.status });
  }

  // ── Magic-byte MIME detection — replaces file.type.startsWith("image/") ──
  const mimeCheck = await validateMimeType(bytes, ALLOWED_IMAGE_MIME_TYPES);
  if (!mimeCheck.ok) {
    return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  // Extension is derived from the server-verified MIME type, not the filename.
  const ext  = extensionFromMime(mimeCheck.mimeType);
  const path = `${hospitalId}/staff-avatars/${session.staff_id}/avatar.${ext}`;

  const bucket = admin.storage.from(STAFF_AVATAR_BUCKET);
  let { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: mimeCheck.mimeType,   // Use verified type, not client-supplied
    upsert: true,
  });

  if (uploadError && isMissingBucketError(uploadError.message)) {
    const storage = admin.storage as unknown as {
      createBucket?: (name: string, options?: { public?: boolean }) => Promise<{ error: { message: string } | null }>;
    };
    await storage.createBucket?.(STAFF_AVATAR_BUCKET, { public: true });
    ({ error: uploadError } = await bucket.upload(path, bytes, {
      contentType: mimeCheck.mimeType,
      upsert: true,
    }));
  }

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = admin.storage.from(STAFF_AVATAR_BUCKET).getPublicUrl(path);
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await admin
    .from("staff_profiles")
    .update({ avatar_url: avatarUrl })
    .eq("hospital_id", hospitalId)
    .eq("id", session.staff_id);

  if (updateError && !isMissingAvatarColumnError(updateError.message)) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await syncStaffAvatarAcrossSessions(session.staff_id, avatarUrl);

  return NextResponse.json({ avatarUrl });
}
