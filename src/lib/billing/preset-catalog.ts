/** Shared billing preset categories and default amounts (used when DB has no row yet). */

export const BILLING_PRESET_CATEGORY = {
  visit: "visit",
  frontdesk: "frontdesk",
  consultation: "consultation",
  procedure: "procedure",
  inpatient: "inpatient",
} as const;

export type BillingPresetCategory =
  (typeof BILLING_PRESET_CATEGORY)[keyof typeof BILLING_PRESET_CATEGORY];

export const NURSING_PROCEDURE_TYPES = [
  "Injection",
  "Dressing",
  "IV Access",
  "Catheter",
  "Observation",
  "Wound Care",
  "Blood Draw",
  "Procedure",
  "Other",
] as const;

export type NursingProcedureType = (typeof NURSING_PROCEDURE_TYPES)[number];

export const DEFAULT_PROCEDURE_AMOUNTS: Record<NursingProcedureType, number> = {
  Injection: 25,
  Dressing: 20,
  "IV Access": 30,
  Catheter: 60,
  Observation: 15,
  "Wound Care": 40,
  "Blood Draw": 15,
  Procedure: 50,
  Other: 20,
};

export const INPATIENT_UNITS = ["Ward", "ICU", "Emergency"] as const;

export type InpatientUnit = (typeof INPATIENT_UNITS)[number];

export const DEFAULT_BED_DAY_RATES: Record<InpatientUnit, number> = {
  Ward: 25000,
  ICU: 75000,
  Emergency: 35000,
};

export function defaultPresetAmount(category: string, name: string): number | undefined {
  if (category === BILLING_PRESET_CATEGORY.procedure) {
    return DEFAULT_PROCEDURE_AMOUNTS[name as NursingProcedureType];
  }
  if (category === BILLING_PRESET_CATEGORY.inpatient) {
    return DEFAULT_BED_DAY_RATES[name as InpatientUnit];
  }
  return undefined;
}
