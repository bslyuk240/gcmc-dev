import { NextResponse } from "next/server";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import {
  getStaffPortalSession,
  syncStaffAvatarAcrossSessions,
} from "@/lib/auth/session";

const STAFF_AVATAR_BUCKET = "staff-avatars";
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

function guessAvatarExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function isMissingBucketError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("bucket not found") || lower.includes("bucket") && lower.includes("not found");
}

function isMissingAvatarColumnError(message: string) {
  return message.toLowerCase().includes("column avatar_url does not exist");
}

export async function POST(request: Request) {
  const session = await getStaffPortalSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const fileValue = formData.get("avatar");

  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (!fileValue.type.startsWith("image/")) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  if (fileValue.size > MAX_AVATAR_SIZE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return NextResponse.json({ error: "configuration" }, { status: 500 });
  }

  const { admin, hospitalId } = scoped;
  const ext = guessAvatarExtension(fileValue);
  const path = `${hospitalId}/staff-avatars/${session.staff_id}/avatar.${ext}`;
  const bytes = Buffer.from(await fileValue.arrayBuffer());

  const bucket = admin.storage.from(STAFF_AVATAR_BUCKET);
  let { error: uploadError } = await bucket.upload(path, bytes, {
    contentType: fileValue.type,
    upsert: true,
  });

  if (uploadError && isMissingBucketError(uploadError.message)) {
    const storage = admin.storage as unknown as {
      createBucket?: (name: string, options?: { public?: boolean }) => Promise<{ error: { message: string } | null }>;
    };
    await storage.createBucket?.(STAFF_AVATAR_BUCKET, { public: true });
    ({ error: uploadError } = await bucket.upload(path, bytes, {
      contentType: fileValue.type,
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
