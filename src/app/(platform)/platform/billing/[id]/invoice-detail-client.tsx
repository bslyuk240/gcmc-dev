"use client";

import Link from "next/link";
import { formatNairaFromKobo } from "@/lib/platform/pricing";
import {
  Card,
  InvoiceStatusBadge,
  PlanBadge,
} from "@/components/platform/page-shell";
import type { PlatformInvoice } from "@/lib/platform/billing-types";

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceDetailClient({ invoice: initial }: { invoice: PlatformInvoice }) {
  const invoice = initial;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/platform/billing" className="text-sm font-semibold text-indigo-600 hover:underline">
          ← Back to billing
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold text-slate-800">{invoice.invoice_number}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{invoice.hospital_name ?? "Hospital"}</span>
              <PlanBadge plan={invoice.plan} />
            </div>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800">Invoice details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Hospital</dt>
              <dd className="text-right text-slate-800">
                {invoice.hospital_name ?? "—"}
                {invoice.hospital_slug ? (
                  <div className="font-mono text-xs text-slate-400">{invoice.hospital_slug}</div>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Billing period</dt>
              <dd className="text-slate-800">
                {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount</dt>
              <dd className="text-lg font-bold text-indigo-700">
                {formatNairaFromKobo(invoice.amount_kobo)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Due date</dt>
              <dd className="text-slate-800">{formatDate(invoice.due_date)}</dd>
            </div>
            {invoice.notes ? (
              <div>
                <dt className="text-slate-500">Notes</dt>
                <dd className="mt-1 text-slate-700">{invoice.notes}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800">Payment</h2>
          {invoice.status === "paid" ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Paid at</dt>
                <dd className="text-slate-800">
                  {invoice.paid_at
                    ? new Date(invoice.paid_at).toLocaleString("en-GB")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Reference</dt>
                <dd className="font-mono text-slate-800">{invoice.payment_reference ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Method</dt>
                <dd className="capitalize text-slate-800">
                  {invoice.payment_method?.replace("_", " ") ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {invoice.status === "void"
                ? "This invoice has been voided."
                : "Awaiting Paystack payment from the hospital admin billing page."}
            </p>
          )}
        </Card>
      </div>

      {invoice.hospital_id ? (
        <Link
          href={`/platform/hospitals/${invoice.hospital_id}`}
          className="inline-block text-sm font-semibold text-indigo-600 hover:underline"
        >
          View hospital →
        </Link>
      ) : null}
    </div>
  );
}
