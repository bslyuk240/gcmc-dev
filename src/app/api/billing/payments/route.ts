import { NextResponse } from "next/server";
import { requireBillingSession } from "@/modules/billing/access";
import { receiveBillingPayment, uiMethodToBillingMethod } from "@/modules/billing/payments/service";
import type { BillingPaymentMethod } from "@/modules/billing/types";
import { notifyDepartmentWorkflow } from "@/lib/email/notifications";

export async function POST(request: Request) {
  try {
    const session = await requireBillingSession("receive");
    const body = await request.json().catch(() => null);
    if (!body?.chargeLineIds?.length) {
      return NextResponse.json({ error: "chargeLineIds is required." }, { status: 400 });
    }

    const method: BillingPaymentMethod = body.paymentMethod
      ? (body.paymentMethod as BillingPaymentMethod)
      : uiMethodToBillingMethod(String(body.method ?? "Cash"));

    const result = await receiveBillingPayment({
      chargeLineIds: body.chargeLineIds as string[],
      paymentMethod: method,
      reference: body.reference != null ? String(body.reference) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
      receivedBy: session.auth_user_id ?? session.staff_id,
      receivedByName: session.full_name,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await notifyDepartmentWorkflow({
      toDepartments: ["accounts"],
      subject: `Payment received: ${result.paymentNumber}`,
      title: "Billing payment received",
      intro: `${session.full_name} recorded a billing payment.`,
      rows: [
        { label: "Payment", value: result.paymentNumber },
        { label: "Amount", value: result.totalAmount },
        { label: "Method", value: method },
      ],
      href: "/app/accounts/payments-history",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment failed.";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
