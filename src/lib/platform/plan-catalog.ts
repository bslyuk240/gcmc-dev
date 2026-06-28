import type { PlatformSettings } from "@/lib/platform/settings";
import type { HospitalBillingCycle } from "@/lib/platform/types";
import type { HospitalPlan } from "@/lib/tenant/types";
import { formatNairaFromKobo } from "@/lib/platform/pricing";

export type PlanFeature = {
  name: string;
  starter: boolean;
  standard: boolean;
  enterprise: boolean;
};

export const PLAN_FEATURES: PlanFeature[] = [
  { name: "Patient Records", starter: true, standard: true, enterprise: true },
  { name: "Appointments", starter: true, standard: true, enterprise: true },
  { name: "Pharmacy Module", starter: true, standard: true, enterprise: true },
  { name: "Lab Module", starter: false, standard: true, enterprise: true },
  { name: "Radiology Module", starter: false, standard: true, enterprise: true },
  { name: "HR & Payroll", starter: false, standard: true, enterprise: true },
  { name: "Advanced Reports", starter: false, standard: false, enterprise: true },
  { name: "Custom Domain", starter: false, standard: false, enterprise: true },
  { name: "API Access", starter: false, standard: true, enterprise: true },
  { name: "Priority Support", starter: false, standard: false, enterprise: true },
  { name: "Multi-branch", starter: false, standard: false, enterprise: true },
  { name: "Audit Trail", starter: true, standard: true, enterprise: true },
];

export const HOSPITAL_PLANS: HospitalPlan[] = ["starter", "standard", "enterprise"];

/** Yearly billing = 10 months of monthly price (2 months free). */
export const YEARLY_BILLING_MONTHS_PAID = 10;

export function planMonthlyKoboFromSettings(
  plan: HospitalPlan,
  settings: PlatformSettings,
): number {
  switch (plan) {
    case "starter":
      return settings.pricing_starter_monthly_kobo;
    case "standard":
      return settings.pricing_standard_monthly_kobo;
    case "enterprise":
      return settings.pricing_enterprise_monthly_kobo;
    default:
      throw new Error(`Unknown plan: ${plan}`);
  }
}

export function resolvePlanAmountKobo(
  plan: HospitalPlan,
  cycle: HospitalBillingCycle,
  settings: PlatformSettings,
): number {
  const monthly = planMonthlyKoboFromSettings(plan, settings);
  if (cycle === "yearly") {
    return monthly * YEARLY_BILLING_MONTHS_PAID;
  }
  return monthly;
}

export function planFeaturesFor(plan: HospitalPlan): string[] {
  const key = plan as keyof Pick<PlanFeature, "starter" | "standard" | "enterprise">;
  return PLAN_FEATURES.filter((f) => f[key]).map((f) => f.name);
}

export function formatPlanPriceLabel(
  plan: HospitalPlan,
  cycle: HospitalBillingCycle,
  settings: PlatformSettings,
): string {
  const monthly = planMonthlyKoboFromSettings(plan, settings);
  if (cycle === "yearly") {
    const yearly = resolvePlanAmountKobo(plan, cycle, settings);
    return `${formatNairaFromKobo(yearly)}/yr (${formatNairaFromKobo(monthly)}/mo)`;
  }
  return `${formatNairaFromKobo(monthly)}/mo`;
}

export function addBillingMonths(from: Date, cycle: HospitalBillingCycle): Date {
  const next = new Date(from);
  const months = cycle === "yearly" ? 12 : 1;
  next.setMonth(next.getMonth() + months);
  return next;
}
