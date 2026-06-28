import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export type WebhookSignatureVerificationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_secret" | "missing_signature" | "invalid_signature" | "stale_timestamp";
    };

type ResendWebhookVerificationInput = {
  rawBody: string;
  headers: Headers;
  secret?: string | null;
  toleranceSeconds?: number;
};

function parseSignatureHeader(header: string | null): {
  timestamp?: string;
  signatures: string[];
} {
  if (!header) return { signatures: [] };

  const signatures: string[] = [];
  let timestamp: string | undefined;
  const tokens = header.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const equalsIndex = token.indexOf("=");
    const key = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    const value = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);

    if (key === "t" && value) {
      timestamp = value;
      continue;
    }

    if (key === "v1" && value) {
      signatures.push(value);
      continue;
    }

    if (key === "v1" && tokens[index + 1]) {
      signatures.push(tokens[index + 1]);
      index += 1;
    }
  }

  return { timestamp, signatures };
}

function webhookSecretBytes(secret: string): Buffer {
  const trimmed = secret.trim();
  if (trimmed.startsWith("whsec_")) {
    return Buffer.from(trimmed.slice("whsec_".length), "base64");
  }
  return Buffer.from(trimmed, "utf8");
}

function safeCompareText(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isFreshTimestamp(timestamp: string, toleranceSeconds: number): boolean {
  const parsed = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsed)) return false;

  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - parsed) <= toleranceSeconds;
}

function signatureMatches(input: {
  secret: string;
  signedPayload: string;
  signature: string;
}): boolean {
  const hmac = createHmac("sha256", webhookSecretBytes(input.secret))
    .update(input.signedPayload)
    .digest();

  return (
    safeCompareText(input.signature, hmac.toString("hex")) ||
    safeCompareText(input.signature, hmac.toString("base64"))
  );
}

export function verifyResendWebhookSignature({
  rawBody,
  headers,
  secret = process.env.RESEND_WEBHOOK_SECRET,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: ResendWebhookVerificationInput): WebhookSignatureVerificationResult {
  const resolvedSecret = secret?.trim();
  if (!resolvedSecret) return { ok: false, reason: "missing_secret" };

  const svixSignature = headers.get("svix-signature");
  const resendSignature = headers.get("x-resend-signature");
  const parsed = parseSignatureHeader(svixSignature ?? resendSignature);
  const timestamp = headers.get("svix-timestamp") ?? parsed.timestamp;
  const svixId = headers.get("svix-id");

  if (!timestamp || parsed.signatures.length === 0) {
    return { ok: false, reason: "missing_signature" };
  }

  if (!isFreshTimestamp(timestamp, toleranceSeconds)) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const payloads = [`${timestamp}.${rawBody}`];
  if (svixId) payloads.push(`${svixId}.${timestamp}.${rawBody}`);

  const valid = parsed.signatures.some((signature) =>
    payloads.some((signedPayload) =>
      signatureMatches({
        secret: resolvedSecret,
        signedPayload,
        signature,
      }),
    ),
  );

  return valid ? { ok: true } : { ok: false, reason: "invalid_signature" };
}
