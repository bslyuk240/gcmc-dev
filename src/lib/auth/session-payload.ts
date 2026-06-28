import type { HMSSession } from "@/lib/auth/session-types";

const DEV_FALLBACK_SECRET = "dev-only-insecure-session-secret-do-not-use-in-production";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // Crash loudly — a missing secret silently allows session forgery.
      throw new Error(
        "[HMS] SESSION_SECRET environment variable is not set. " +
        "Set a random 64-char hex string in your deployment environment."
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeLegacyBase64Json(raw: string): HMSSession | null {
  try {
    const binary = atob(raw);
    const json = decodeURIComponent(
      Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    );
    return JSON.parse(json) as HMSSession;
  } catch {
    return null;
  }
}

async function hmacSign(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

async function hmacVerify(message: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(message);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

function isValidTenantSession(session: HMSSession | null): session is HMSSession {
  return Boolean(session?.hospital_id && session?.hospital_slug && session?.staff_id);
}

export async function serialiseSessionPayload(session: HMSSession): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

export async function deserialiseSessionPayload(raw: string): Promise<HMSSession | null> {
  const dot = raw.lastIndexOf(".");
  if (dot === -1) {
    const legacy = decodeLegacyBase64Json(raw);
    return isValidTenantSession(legacy) ? legacy : null;
  }

  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!(await hmacVerify(payload, sig))) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payload));
    const session = JSON.parse(json) as HMSSession;
    return isValidTenantSession(session) ? session : null;
  } catch {
    return null;
  }
}
