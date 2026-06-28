"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminKpiCard,
  AdminStatusBadge,
  AdminCardTitle,
} from "@/components/admin/admin-ui";
import {
  initializeSubscriptionCheckoutAction,
  verifySubscriptionCheckoutAction,
  type AdminBillingOverview,
} from "@/server/actions/admin/billing";
import type { HospitalPlan } from "@/lib/tenant/types";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function subscriptionStatusLabel(overview: AdminBillingOverview): string {
  if (overview.subscription?.status === "active") return "Active";
  if (overview.subscription?.status === "trial") return "Trial";
  if (overview.hospitalStatus === "suspended") return "Suspended";
  if (overview.subscription?.status === "expired") return "Expired";
  return overview.hospitalStatus === "active" ? "Active" : "Inactive";
}

export function AdminBillingClient({ overview: initialOverview }: { overview: AdminBillingOverview }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");

  const [overview, setOverview] = useState(initialOverview);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    initialOverview.subscription?.billingCycle ?? "monthly",
  );
  const [busyPlan, setBusyPlan] = useState<HospitalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const statusLabel = subscriptionStatusLabel(overview);
  const currentPlanLabel =
    overview.plans.find((p) => p.plan === overview.currentPlan)?.label ?? overview.currentPlan;

  const sortedPlans = useMemo(
    () => [...overview.plans].sort((a, b) => a.monthlyKobo - b.monthlyKobo),
    [overview.plans],
  );

  useEffect(() => {
    if (!reference) return;
    let alive = true;
    setVerifying(true);
    setVerifyMsg(null);
    setError(null);

    void verifySubscriptionCheckoutAction(reference).then((result) => {
      if (!alive) return;
      setVerifying(false);
      if (result.success) {
        setOverview(result.data.overview);
        if (result.data.overview.subscription?.billingCycle) {
          setBillingCycle(result.data.overview.subscription.billingCycle);
        }
        setVerifyMsg("Payment confirmed. Your subscription is now active.");
        router.replace("/app/admin/billing", { scroll: false });
      } else {
        setError(result.error);
      }
    });

    return () => {
      alive = false;
    };
  }, [reference, router]);

  async function handleSubscribe(plan: HospitalPlan) {
    setBusyPlan(plan);
    setError(null);
    const result = await initializeSubscriptionCheckoutAction({
      plan,
      billing_cycle: billingCycle,
    });
    setBusyPlan(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    window.location.href = result.data.authorizationUrl;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscription & Billing"
        subtitle="Choose a plan and pay securely via Paystack. All pricing is set by the platform."
      />

      {verifying ? (
        <div className="rounded-none border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Verifying your payment…
        </div>
      ) : null}

      {verifyMsg ? (
        <div className="rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {verifyMsg}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!overview.paystackConfigured ? (
        <div className="rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Online payments are not configured yet. Contact platform support to enable Paystack.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard label="Current Plan" value={currentPlanLabel} />
        <AdminKpiCard
          label="Subscription Status"
          value={statusLabel}
          sub={
            overview.subscription?.currentPeriodEnd
              ? `Renews ${formatDate(overview.subscription.currentPeriodEnd)}`
              : overview.subscription?.trialEndsAt
                ? `Trial ends ${formatDate(overview.subscription.trialEndsAt)}`
                : undefined
          }
        />
        <AdminKpiCard
          label="Billing Cycle"
          value={overview.subscription?.billingCycle ?? "—"}
        />
        <AdminKpiCard label="Hospital Status" value={overview.hospitalStatus} />
      </div>

      <Card className="overflow-hidden p-0">
        <AdminCardTitle
          title="Available Plans"
          action={
            <div className="flex rounded-none border border-slate-200 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3 py-1.5 ${billingCycle === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-3 py-1.5 ${billingCycle === "yearly" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              >
                Yearly (2 mo free)
              </button>
            </div>
          }
        />
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isCurrent =
              plan.plan === overview.currentPlan &&
              overview.subscription?.status === "active";
            const price =
              billingCycle === "yearly" ? plan.yearlyLabel : plan.monthlyLabel;
            const amountKobo =
              billingCycle === "yearly" ? plan.yearlyKobo : plan.monthlyKobo;

            return (
              <div
                key={plan.plan}
                className={`flex flex-col border p-5 ${
                  plan.plan === "standard"
                    ? "border-indigo-300 bg-indigo-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.label}</h3>
                    <p className="mt-1 text-2xl font-bold text-indigo-700">{price}</p>
                  </div>
                  {isCurrent ? <AdminStatusBadge status="Active" /> : null}
                </div>

                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {plan.features.slice(0, 8).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 8 ? (
                    <li className="text-xs text-slate-400">
                      +{plan.features.length - 8} more features
                    </li>
                  ) : null}
                </ul>

                <button
                  type="button"
                  disabled={
                    !overview.paystackConfigured ||
                    busyPlan !== null ||
                    verifying ||
                    (isCurrent && billingCycle === (overview.subscription?.billingCycle ?? "monthly"))
                  }
                  onClick={() => void handleSubscribe(plan.plan)}
                  className="mt-5 w-full rounded-none bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyPlan === plan.plan
                    ? "Redirecting to Paystack…"
                    : isCurrent
                      ? "Renew / Change cycle"
                      : plan.plan === overview.currentPlan
                        ? "Subscribe"
                        : `Upgrade to ${plan.label}`}
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Charged {amountKobo / 100} NGN via Paystack
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <AdminCardTitle title="Payment History" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {["Invoice", "Plan", "Period", "Amount", "Status", "Paid", "Reference"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overview.invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3 capitalize text-slate-700">{inv.plan}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                    {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{inv.amountLabel}</td>
                  <td className="px-5 py-3">
                    <AdminStatusBadge
                      status={
                        inv.status === "paid"
                          ? "Good"
                          : inv.status === "overdue"
                            ? "Critical"
                            : "Warning"
                      }
                    />
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(inv.paidAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">
                    {inv.paymentReference ?? "—"}
                  </td>
                </tr>
              ))}
              {overview.invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-500">
                    No subscription payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
