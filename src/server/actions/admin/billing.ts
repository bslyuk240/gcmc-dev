"use server";

import { getServerSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config/app";
import { fulfillSubscriptionCheckout } from "@/lib/platform/fulfill-subscription-checkout";
import {
  HOSPITAL_PLANS,
  planFeaturesFor,
  planMonthlyKoboFromSettings,
  resolvePlanAmountKobo,
} from "@/lib/platform/plan-catalog";
import { formatNairaFromKobo, planLabel } from "@/lib/platform/pricing";
import { getPlatformSettings } from "@/lib/platform/settings";
import type { HospitalBillingCycle } from "@/lib/platform/types";
import {
  generatePaystackReference,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/lib/paystack/client";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { HospitalPlan } from "@/lib/tenant/types";

export type AdminBillingActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type AdminPlanOption = {
  plan: HospitalPlan;
  label: string;
  monthlyKobo: number;
  monthlyLabel: string;
  yearlyKobo: number;
  yearlyLabel: string;
  features: string[];
};

export type AdminBillingOverview = {
  hospitalName: string;
  hospitalStatus: string;
  currentPlan: HospitalPlan;
  subscription: {
    status: string;
    billingCycle: HospitalBillingCycle | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    gracePeriodEnd: string | null;
  } | null;
  plans: AdminPlanOption[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    plan: HospitalPlan;
    amountKobo: number;
    amountLabel: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    paymentReference: string | null;
  }>;
  paystackConfigured: boolean;
};

function isValidPlan(plan: string): plan is HospitalPlan {
  return HOSPITAL_PLANS.includes(plan as HospitalPlan);
}

function isValidCycle(cycle: string): cycle is HospitalBillingCycle {
  return cycle === "monthly" || cycle === "yearly";
}

async function guardHospitalAdmin<T>(
  fn: (ctx: {
    session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
    admin: NonNullable<Awaited<ReturnType<typeof createTenantAdminClient>>>["admin"];
    hospitalId: string;
  }) => Promise<AdminBillingActionResult<T>>,
): Promise<AdminBillingActionResult<T>> {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "Admin access required." };
  }

  const scoped = await createTenantAdminClient();
  if (!scoped) {
    return { success: false, error: "Service not configured." };
  }

  if (session.hospital_id && session.hospital_id !== scoped.hospitalId) {
    return { success: false, error: "Tenant mismatch." };
  }

  return fn({ session, admin: scoped.admin, hospitalId: scoped.hospitalId });
}

async function fetchAdminBillingOverview(
  admin: NonNullable<Awaited<ReturnType<typeof createTenantAdminClient>>>["admin"],
  hospitalId: string,
): Promise<AdminBillingActionResult<AdminBillingOverview>> {
  const settings = await getPlatformSettings();

  const [hospitalRes, subRes, invoicesRes] = await Promise.all([
    admin.from("hospitals").select("name, plan, status").eq("id", hospitalId).maybeSingle(),
    admin
      .from("hospital_subscriptions")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("platform_invoices")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (hospitalRes.error || !hospitalRes.data) {
    return { success: false, error: hospitalRes.error?.message ?? "Hospital not found." };
  }

  const hospital = hospitalRes.data;
  const sub = subRes.data;
  const plans: AdminPlanOption[] = HOSPITAL_PLANS.map((plan) => {
    const monthlyKobo = planMonthlyKoboFromSettings(plan, settings);
    const yearlyKobo = resolvePlanAmountKobo(plan, "yearly", settings);
    return {
      plan,
      label: planLabel(plan),
      monthlyKobo,
      monthlyLabel: `${formatNairaFromKobo(monthlyKobo)}/mo`,
      yearlyKobo,
      yearlyLabel: `${formatNairaFromKobo(yearlyKobo)}/yr`,
      features: planFeaturesFor(plan),
    };
  });

  return {
    success: true,
    data: {
      hospitalName: String(hospital.name),
      hospitalStatus: String(hospital.status),
      currentPlan: hospital.plan as HospitalPlan,
      subscription: sub
        ? {
            status: String(sub.status),
            billingCycle: (sub.billing_cycle as HospitalBillingCycle) ?? null,
            trialEndsAt: sub.trial_ends_at ? String(sub.trial_ends_at) : null,
            currentPeriodEnd: sub.current_period_end ? String(sub.current_period_end) : null,
            gracePeriodEnd: sub.grace_period_end ? String(sub.grace_period_end) : null,
          }
        : null,
      plans,
      invoices: (invoicesRes.data ?? []).map((inv) => ({
        id: String(inv.id),
        invoiceNumber: String(inv.invoice_number),
        plan: inv.plan as HospitalPlan,
        amountKobo: Number(inv.amount_kobo),
        amountLabel: formatNairaFromKobo(Number(inv.amount_kobo)),
        status: String(inv.status),
        periodStart: String(inv.period_start).slice(0, 10),
        periodEnd: String(inv.period_end).slice(0, 10),
        paidAt: inv.paid_at ? String(inv.paid_at) : null,
        paymentReference: inv.payment_reference ? String(inv.payment_reference) : null,
      })),
      paystackConfigured: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    },
  };
}

export async function getAdminBillingOverviewAction(): Promise<
  AdminBillingActionResult<AdminBillingOverview>
> {
  return guardHospitalAdmin(async ({ admin, hospitalId }) => fetchAdminBillingOverview(admin, hospitalId));
}

export async function initializeSubscriptionCheckoutAction(input: {
  plan: string;
  billing_cycle: string;
}): Promise<AdminBillingActionResult<{ authorizationUrl: string; reference: string }>> {
  return guardHospitalAdmin(async ({ session, admin, hospitalId }) => {
    if (!isValidPlan(input.plan)) {
      return { success: false, error: "Invalid plan." };
    }
    if (!isValidCycle(input.billing_cycle)) {
      return { success: false, error: "Invalid billing cycle." };
    }

    if (!process.env.PAYSTACK_SECRET_KEY?.trim()) {
      return { success: false, error: "Paystack is not configured. Contact platform support." };
    }

    const settings = await getPlatformSettings();
    const amountKobo = resolvePlanAmountKobo(input.plan, input.billing_cycle, settings);
    const reference = generatePaystackReference(hospitalId);

    const now = new Date();
    const periodStart = now.toISOString().slice(0, 10);
    const periodEndDate = new Date(now);
    const months = input.billing_cycle === "yearly" ? 12 : 1;
    periodEndDate.setMonth(periodEndDate.getMonth() + months);
    const periodEnd = periodEndDate.toISOString().slice(0, 10);

    const { data: invoice, error: invoiceError } = await admin
      .from("platform_invoices")
      .insert({
        hospital_id: hospitalId,
        plan: input.plan,
        period_start: periodStart,
        period_end: periodEnd,
        amount_kobo: amountKobo,
        due_date: periodStart,
        status: "sent",
        notes: `Paystack checkout — ${input.billing_cycle} ${input.plan}`,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      return { success: false, error: invoiceError?.message ?? "Could not create invoice." };
    }

    const { data: checkout, error: checkoutError } = await admin
      .from("subscription_checkouts")
      .insert({
        hospital_id: hospitalId,
        plan: input.plan,
        billing_cycle: input.billing_cycle,
        amount_kobo: amountKobo,
        paystack_reference: reference,
        invoice_id: invoice.id,
        status: "pending",
        initiated_by: session.staff_id,
      })
      .select("id")
      .single();

    if (checkoutError || !checkout) {
      await admin.from("platform_invoices").delete().eq("id", invoice.id);
      return { success: false, error: checkoutError?.message ?? "Could not start checkout." };
    }

    const callbackUrl = `${appConfig.appUrl}/app/admin/billing?reference=${encodeURIComponent(reference)}`;
    const init = await initializePaystackTransaction({
      email: session.email,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        hospital_id: hospitalId,
        checkout_id: String(checkout.id),
        plan: input.plan,
        billing_cycle: input.billing_cycle,
      },
    });

    if (!init.ok) {
      await admin.from("subscription_checkouts").update({ status: "failed" }).eq("id", checkout.id);
      await admin.from("platform_invoices").update({ status: "void" }).eq("id", invoice.id);
      return { success: false, error: init.error };
    }

    return {
      success: true,
      data: { authorizationUrl: init.authorizationUrl, reference: init.reference },
    };
  });
}

export async function verifySubscriptionCheckoutAction(
  reference: string,
): Promise<AdminBillingActionResult<{ activated: boolean; overview: AdminBillingOverview }>> {
  return guardHospitalAdmin(async ({ admin, hospitalId }) => {
    const ref = reference.trim();
    if (!ref) {
      return { success: false, error: "Missing payment reference." };
    }

    const { data: checkout } = await admin
      .from("subscription_checkouts")
      .select("hospital_id, status")
      .eq("paystack_reference", ref)
      .maybeSingle();

    if (!checkout) {
      return { success: false, error: "Checkout not found." };
    }
    if (String(checkout.hospital_id) !== hospitalId) {
      return { success: false, error: "Unauthorized checkout." };
    }

    if (checkout.status !== "completed") {
      const verified = await verifyPaystackTransaction(ref);
      if (!verified.ok) {
        return { success: false, error: verified.error };
      }
      if (verified.status !== "success") {
        return { success: false, error: "Payment was not completed." };
      }

      const paidAt = verified.paidAt ?? new Date().toISOString();
      const result = await fulfillSubscriptionCheckout(
        admin,
        ref,
        verified.amountKobo,
        paidAt,
        { source: "verify" },
      );

      if (!result.ok) {
        return { success: false, error: result.error };
      }
    }

    const overview = await fetchAdminBillingOverview(admin, hospitalId);
    if (!overview.success) {
      return { success: false, error: overview.error };
    }

    return { success: true, data: { activated: true, overview: overview.data } };
  });
}
