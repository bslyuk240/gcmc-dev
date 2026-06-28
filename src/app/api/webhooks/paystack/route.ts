import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfillSubscriptionCheckout } from "@/lib/platform/fulfill-subscription-checkout";
import { verifyPaystackSignature } from "@/lib/paystack/client";

export const runtime = "nodejs";

type PaystackWebhookPayload = {
  event?: string;
  data?: {
    id?: number;
    status?: string;
    reference?: string;
    amount?: number;
    paid_at?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const eventType = String(payload.event ?? "");
  const data = payload.data;
  const reference = data?.reference ? String(data.reference) : "";

  if (eventType !== "charge.success" || !reference) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const db = createAdminClient();
  if (!db) {
    return NextResponse.json({ error: "Service not configured." }, { status: 503 });
  }

  const eventKey = `${eventType}:${data?.id ?? reference}`;
  const { error: idempotencyError } = await db.from("paystack_webhook_events").insert({
    event_key: eventKey,
    event_type: eventType,
    reference,
    payload: payload as unknown as Record<string, unknown>,
  });

  if (idempotencyError) {
    if (idempotencyError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: idempotencyError.message }, { status: 500 });
  }

  if (String(data?.status ?? "") !== "success") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const amountKobo = Number(data?.amount ?? 0);
  const paidAt = data?.paid_at ? String(data.paid_at) : new Date().toISOString();

  const result = await fulfillSubscriptionCheckout(db, reference, amountKobo, paidAt, {
    source: "webhook",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    received: true,
    fulfilled: !result.alreadyProcessed,
    hospital_id: result.hospitalId,
  });
}
