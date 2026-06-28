import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

export function getPaystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key || null;
}

export function generatePaystackReference(hospitalId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `HMS-${hospitalId.slice(0, 8).toUpperCase()}-${ts}-${rand}`;
}

export type SignatureVerificationResult =
  | { ok: true }
  | { ok: false; reason: "missing_secret" | "missing_signature" | "invalid_signature" };

/**
 * Verify a Paystack webhook signature (HMAC-SHA512 over the raw request body).
 * Returns a typed result so callers can distinguish between configuration errors
 * and signature mismatches without leaking the secret value into logs.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
): SignatureVerificationResult {
  const secret = getPaystackSecretKey();

  if (!secret) {
    console.warn("[paystack/webhook] PAYSTACK_SECRET_KEY is not configured; signature cannot be verified.");
    return { ok: false, reason: "missing_secret" };
  }

  if (!signature) {
    return { ok: false, reason: "missing_signature" };
  }

  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(signature, "hex");
  const isValid = expected.length === actual.length && timingSafeEqual(expected, actual);

  return isValid
    ? { ok: true }
    : { ok: false, reason: "invalid_signature" };
}

export type PaystackInitializeInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export type PaystackInitializeResult =
  | {
      ok: true;
      authorizationUrl: string;
      accessCode: string;
      reference: string;
    }
  | { ok: false; error: string };

export async function initializePaystackTransaction(
  input: PaystackInitializeInput,
): Promise<PaystackInitializeResult> {
  const secret = getPaystackSecretKey();
  if (!secret) {
    return { ok: false, error: "Paystack is not configured." };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
    };
  };

  if (!res.ok || !json.status || !json.data?.authorization_url) {
    return {
      ok: false,
      error: json.message ?? "Could not start Paystack checkout.",
    };
  }

  return {
    ok: true,
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code ?? "",
    reference: json.data.reference ?? input.reference,
  };
}

export type PaystackVerifyResult =
  | {
      ok: true;
      status: string;
      amountKobo: number;
      reference: string;
      paidAt: string | null;
    }
  | { ok: false; error: string };

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secret = getPaystackSecretKey();
  if (!secret) {
    return { ok: false, error: "Paystack is not configured." };
  }

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    },
  );

  const json = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: {
      status?: string;
      amount?: number;
      reference?: string;
      paid_at?: string;
    };
  };

  if (!res.ok || !json.status || !json.data) {
    return { ok: false, error: json.message ?? "Could not verify payment." };
  }

  return {
    ok: true,
    status: String(json.data.status ?? ""),
    amountKobo: Number(json.data.amount ?? 0),
    reference: String(json.data.reference ?? reference),
    paidAt: json.data.paid_at ? String(json.data.paid_at) : null,
  };
}
