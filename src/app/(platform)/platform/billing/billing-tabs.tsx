"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, StatusBadge, PlanBadge, formatDate } from "@/components/platform/page-shell";
import type { PlatformInvoice } from "@/lib/platform/billing-types";

const INVOICE_STATUS: Record<string, string> = {
  draft:   "bg-slate-100 text-slate-600",
  sent:    "bg-blue-50 text-blue-700",
  paid:    "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
  void:    "bg-slate-50 text-slate-400",
};

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(kobo / 100);
}

function formatPeriod(start: string, end: string) {
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${f(start)} – ${f(end)}`;
}

type Subscription = {
  id: string;
  hospital_name: string;
  hospital_slug: string;
  plan: string;
  status: string;
  billing_cycle: string;
  mrr: number;
  created_at: string;
};

const TABS = ["Subscriptions", "Invoices", "Payments", "Billing Settings"] as const;

export function BillingTabs({ subscriptions, invoices }: { subscriptions: Subscription[]; invoices: PlatformInvoice[] }) {
  const [tab, setTab] = useState<typeof TABS[number]>("Subscriptions");

  return (
    <Card>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Subscriptions */}
      {tab === "Subscriptions" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Hospital", "Plan", "Status", "MRR", "Billing Cycle", "Next Billing", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{s.hospital_name}</p>
                    <p className="text-xs text-slate-400">{s.hospital_slug}</p>
                  </td>
                  <td className="px-5 py-3.5"><PlanBadge plan={s.plan} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-5 py-3.5 font-medium text-slate-700">{s.mrr > 0 ? formatNaira(s.mrr) : "—"}</td>
                  <td className="px-5 py-3.5 capitalize text-slate-500">{s.billing_cycle}</td>
                  <td className="px-5 py-3.5 text-slate-500">—</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/platform/hospitals/${s.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No subscriptions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices */}
      {tab === "Invoices" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Invoice #", "Hospital", "Period", "Amount", "Due Date", "Status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{inv.invoice_number}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{inv.hospital_name ?? "—"}</p>
                    {inv.hospital_slug && <p className="text-xs text-slate-400">{inv.hospital_slug}</p>}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-xs">{formatPeriod(inv.period_start, inv.period_end)}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{formatNaira(inv.amount_kobo)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">{formatDate(`${inv.due_date}T00:00:00`)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${INVOICE_STATUS[inv.status] ?? ""}`}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/platform/billing/${inv.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      {tab === "Payments" && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-slate-600">Payment History</p>
          <p className="mt-1 text-xs text-slate-400">Paystack subscription payments recorded automatically when hospital admins subscribe.</p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Date", "Hospital", "Amount", "Method", "Reference"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.filter(inv => inv.status === "paid").map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(inv.paid_at ? String(inv.paid_at) : undefined)}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{inv.hospital_name ?? "—"}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{formatNaira(inv.amount_kobo)}</td>
                    <td className="px-5 py-3.5 capitalize text-slate-500">{String(inv.payment_method ?? "—").replace("_", " ")}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{String(inv.payment_reference ?? "—")}</td>
                  </tr>
                ))}
                {invoices.filter(inv => inv.status === "paid").length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Billing Settings */}
      {tab === "Billing Settings" && (
        <div className="px-5 py-6 max-w-lg space-y-4">
          <p className="text-sm text-slate-500">Configure plan pricing in <Link href="/platform/settings" className="font-semibold text-indigo-600 hover:underline">Plans & pricing</Link>.</p>
          <div className="space-y-3">
            {[
              { plan: "Starter",    price: "₦50,000/mo" },
              { plan: "Standard",   price: "₦150,000/mo" },
              { plan: "Enterprise", price: "₦500,000/mo" },
            ].map((p) => (
              <div key={p.plan} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{p.plan}</span>
                <span className="text-sm font-bold text-indigo-700">{p.price}</span>
              </div>
            ))}
          </div>
          <Link href="/platform/settings" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
            Edit pricing in Plans & pricing →
          </Link>
        </div>
      )}
    </Card>
  );
}
