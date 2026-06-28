import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyResendWebhookSignature } from "@/lib/security/webhooks";

export const runtime = "nodejs";

const ResendWebhookPayloadSchema = z.object({
  type: z.string().trim().max(120).optional(),
  data: z.unknown().optional(),
}).passthrough();

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = verifyResendWebhookSignature({
    rawBody,
    headers: request.headers,
  });

  if (!verification.ok) {
    if (verification.reason === "missing_secret") {
      return NextResponse.json({ error: "Webhook service not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = ResendWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
