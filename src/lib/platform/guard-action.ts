"use server";

import { requirePlatformAdmin } from "@/lib/server/platformAccess";

export type PlatformActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function requirePlatformActor(): Promise<{
  profile: Awaited<ReturnType<typeof requirePlatformAdmin>>;
}> {
  const profile = await requirePlatformAdmin();
  return { profile };
}

export async function guardPlatformAction<T>(
  fn: (ctx: Awaited<ReturnType<typeof requirePlatformActor>>) => Promise<PlatformActionResult<T>>,
): Promise<PlatformActionResult<T>> {
  try {
    const ctx = await requirePlatformActor();
    return await fn(ctx);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unauthorized.",
    };
  }
}
