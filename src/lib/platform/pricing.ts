import type { HospitalPlan } from "@/lib/tenant/types";

/** Monthly SaaS pricing in kobo (NGN × 100). Authoritative for server-side invoice creation. */
export const PLAN_MONTHLY_KOBO: Record<HospitalPlan, number> = {
  starter: 50_000 * 100,
  standard: 150_000 * 100,
  enterprise: 500_000 * 100,
};

export function planMonthlyAmountKobo(plan: HospitalPlan): number {
  const amount = PLAN_MONTHLY_KOBO[plan];
  if (!amount || amount <= 0) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  return amount;
}

export function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(naira);
}

export function planLabel(plan: HospitalPlan): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}
