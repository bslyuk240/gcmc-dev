import "server-only";

import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import { getBedDayRate } from "@/modules/billing/presets/service";
import type {
  ChargeStatus,
  InpatientCharge,
  InpatientChargeType,
  InpatientStay,
  InpatientStaySummary,
  InpatientSummaryLine,
} from "@/lib/inpatient/types";

function mapStay(row: Record<string, unknown>): InpatientStay {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name),
    unit: String(row.unit),
    bed: row.bed != null ? String(row.bed) : null,
    admissionOrderId: row.admission_order_id != null ? String(row.admission_order_id) : null,
    wardPatientId: row.ward_patient_id != null ? String(row.ward_patient_id) : null,
    doctorInCharge: row.doctor_in_charge != null ? String(row.doctor_in_charge) : null,
    admittedAt: String(row.admitted_at),
    dischargedAt: row.discharged_at != null ? String(row.discharged_at) : null,
    status: row.status as InpatientStay["status"],
  };
}

function mapCharge(row: Record<string, unknown>): InpatientCharge {
  return {
    id: String(row.id),
    stayId: String(row.stay_id),
    chargeType: row.charge_type as InpatientCharge["chargeType"],
    description: String(row.description),
    quantity: Number(row.quantity),
    unitAmount: Number(row.unit_amount),
    totalAmount: Number(row.total_amount),
    status: row.status as InpatientCharge["status"],
    chargeDate: row.charge_date != null ? String(row.charge_date).slice(0, 10) : null,
    recordedBy: row.recorded_by != null ? String(row.recorded_by) : null,
    recordedAt: String(row.recorded_at),
  };
}

function inStayWindow(iso: string | null | undefined, admittedAt: string, dischargedAt: string | null) {
  if (!iso) return false;
  const value = new Date(iso).getTime();
  const start = new Date(admittedAt).getTime();
  const end = dischargedAt ? new Date(dischargedAt).getTime() : Date.now();
  if (Number.isNaN(value) || Number.isNaN(start)) return false;
  return value >= start && value <= end;
}

function isPendingStatus(status: string) {
  return status === "Pending" || status === "Billed" || status === "Partial";
}

export async function listInpatientStays(input?: {
  status?: InpatientStay["status"];
  patientId?: string;
}): Promise<InpatientStay[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("inpatient_stays")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("admitted_at", { ascending: false });

  if (input?.status) query = query.eq("status", input.status);
  if (input?.patientId) query = query.eq("patient_id", input.patientId);

  const { data, error } = await query;
  if (error) {
    console.error("[listInpatientStays]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapStay(row as Record<string, unknown>));
}

export async function createInpatientStay(input: {
  patientId: string;
  patientName: string;
  unit: string;
  bed?: string | null;
  admissionOrderId?: string | null;
  wardPatientId?: string | null;
  doctorInCharge?: string | null;
  recordedBy: string;
}): Promise<{ stay: InpatientStay } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;

  const { data: existing } = await admin
    .from("inpatient_stays")
    .select("id")
    .eq("hospital_id", hospitalId)
    .eq("patient_id", input.patientId)
    .eq("unit", input.unit)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return { error: "An active inpatient stay already exists for this patient in this unit." };
  }

  const { error: preauthError } = await admin.rpc("nhis_assert_admission_preauth", {
    p_hospital_id: hospitalId,
    p_patient_ref: input.patientId,
  });
  if (preauthError) {
    return { error: preauthError.message };
  }

  const admittedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("inpatient_stays")
    .insert({
      hospital_id: hospitalId,
      patient_id: input.patientId,
      patient_name: input.patientName,
      unit: input.unit,
      bed: input.bed ?? null,
      admission_order_id: input.admissionOrderId ?? null,
      ward_patient_id: input.wardPatientId ?? null,
      doctor_in_charge: input.doctorInCharge ?? null,
      admitted_at: admittedAt,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not open inpatient stay." };

  const stay = mapStay(data as Record<string, unknown>);
  const bedRate = await getBedDayRate(input.unit);
  const today = new Date().toISOString().slice(0, 10);

  await admin.from("inpatient_charges").insert({
    hospital_id: hospitalId,
    stay_id: stay.id,
    charge_type: "bed_day",
    description: `${input.unit} bed · day 1`,
    quantity: 1,
    unit_amount: bedRate,
    total_amount: bedRate,
    status: "Billed",
    charge_date: today,
    recorded_by: input.recordedBy,
  });

  return { stay };
}

export async function dischargeInpatientStay(input: {
  stayId?: string;
  patientId?: string;
  unit?: string;
}): Promise<{ stay: InpatientStay } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  let query = admin
    .from("inpatient_stays")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("status", "active");

  if (input.stayId) query = query.eq("id", input.stayId);
  if (input.patientId) query = query.eq("patient_id", input.patientId);
  if (input.unit) query = query.eq("unit", input.unit);

  const { data: row, error: findError } = await query.maybeSingle();
  if (findError || !row) return { error: "Active inpatient stay not found." };

  const dischargedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("inpatient_stays")
    .update({ status: "discharged", discharged_at: dischargedAt, updated_at: dischargedAt })
    .eq("id", row.id)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not discharge stay." };
  return { stay: mapStay(data as Record<string, unknown>) };
}

export async function addInpatientCharge(input: {
  stayId: string;
  chargeType: InpatientChargeType;
  description: string;
  quantity: number;
  unitAmount: number;
  recordedBy: string;
  chargeDate?: string;
}): Promise<{ charge: InpatientCharge } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const totalAmount = input.quantity * input.unitAmount;

  const { data, error } = await admin
    .from("inpatient_charges")
    .insert({
      hospital_id: hospitalId,
      stay_id: input.stayId,
      charge_type: input.chargeType,
      description: input.description.trim(),
      quantity: input.quantity,
      unit_amount: input.unitAmount,
      total_amount: totalAmount,
      status: "Billed",
      charge_date: input.chargeDate ?? new Date().toISOString().slice(0, 10),
      recorded_by: input.recordedBy,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not record charge." };
  return { charge: mapCharge(data as Record<string, unknown>) };
}

export async function addBedDayCharge(input: {
  stayId: string;
  recordedBy: string;
}): Promise<{ charge: InpatientCharge } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const { data: stayRow, error: stayError } = await admin
    .from("inpatient_stays")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("id", input.stayId)
    .maybeSingle();

  if (stayError || !stayRow) return { error: "Inpatient stay not found." };
  if (stayRow.status !== "active") return { error: "Bed-day charges can only be added to active stays." };

  const unit = String(stayRow.unit);
  const bedRate = await getBedDayRate(unit);
  const today = new Date().toISOString().slice(0, 10);

  const { count } = await admin
    .from("inpatient_charges")
    .select("id", { count: "exact", head: true })
    .eq("stay_id", input.stayId)
    .eq("charge_type", "bed_day")
    .eq("charge_date", today);

  if ((count ?? 0) > 0) return { error: "A bed-day charge for today already exists." };

  const { count: dayCount } = await admin
    .from("inpatient_charges")
    .select("id", { count: "exact", head: true })
    .eq("stay_id", input.stayId)
    .eq("charge_type", "bed_day");

  return addInpatientCharge({
    stayId: input.stayId,
    chargeType: "bed_day",
    description: `${unit} bed · day ${(dayCount ?? 0) + 1}`,
    quantity: 1,
    unitAmount: bedRate,
    recordedBy: input.recordedBy,
    chargeDate: today,
  });
}

export async function updateInpatientChargeStatus(input: {
  chargeId: string;
  status: ChargeStatus;
}): Promise<{ charge: InpatientCharge } | { error: string }> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return { error: "Service not configured." };

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("inpatient_charges")
    .update({ status: input.status })
    .eq("hospital_id", hospitalId)
    .eq("id", input.chargeId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not update charge." };
  return { charge: mapCharge(data as Record<string, unknown>) };
}

export async function getInpatientStaySummary(stayId: string): Promise<InpatientStaySummary | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { admin, hospitalId } = scoped;
  const { data: stayRow, error: stayError } = await admin
    .from("inpatient_stays")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("id", stayId)
    .maybeSingle();

  if (stayError || !stayRow) return null;

  const stay = mapStay(stayRow as Record<string, unknown>);

  const [
    { data: inpatientCharges },
    { data: nursingCharges },
    { data: labCharges },
    { data: pharmacyBills },
    { data: consultationFees },
  ] = await Promise.all([
    admin.from("inpatient_charges").select("*").eq("stay_id", stayId).order("recorded_at", { ascending: false }),
    admin.from("nursing_charges").select("*").eq("hospital_id", hospitalId).eq("patient_id", stay.patientId),
    admin.from("lab_charges").select("*").eq("hospital_id", hospitalId).eq("patient_id", stay.patientId),
    admin.from("pharmacy_bills").select("*").eq("hospital_id", hospitalId).eq("patient_id", stay.patientId),
    admin.from("consultation_fees").select("*").eq("hospital_id", hospitalId).eq("patient_id", stay.patientId),
  ]);

  const lines: InpatientSummaryLine[] = [];

  for (const row of inpatientCharges ?? []) {
    const charge = mapCharge(row as Record<string, unknown>);
    lines.push({
      id: charge.id,
      source: "inpatient",
      category: charge.chargeType === "bed_day" ? "Bed day" : "Consumable",
      description: charge.description,
      amount: charge.totalAmount,
      status: charge.status,
      occurredAt: charge.recordedAt,
    });
  }

  for (const row of nursingCharges ?? []) {
    const performedAt = String((row as Record<string, unknown>).performed_at ?? "");
    if (!inStayWindow(performedAt, stay.admittedAt, stay.dischargedAt)) continue;
    lines.push({
      id: String((row as Record<string, unknown>).id),
      source: "nursing",
      category: "Nursing procedure",
      description: String((row as Record<string, unknown>).description ?? (row as Record<string, unknown>).procedure_type ?? "Nursing charge"),
      amount: Number((row as Record<string, unknown>).amount ?? 0),
      status: String((row as Record<string, unknown>).status ?? "Pending"),
      occurredAt: performedAt,
    });
  }

  for (const row of labCharges ?? []) {
    const completedAt = String((row as Record<string, unknown>).completed_at ?? "");
    if (!inStayWindow(completedAt, stay.admittedAt, stay.dischargedAt)) continue;
    lines.push({
      id: String((row as Record<string, unknown>).id),
      source: "lab",
      category: "Laboratory",
      description: String((row as Record<string, unknown>).test_name ?? "Lab test"),
      amount: Number((row as Record<string, unknown>).amount ?? 0),
      status: String((row as Record<string, unknown>).status ?? "Pending"),
      occurredAt: completedAt,
    });
  }

  for (const row of pharmacyBills ?? []) {
    const dispensedAt = String((row as Record<string, unknown>).dispensed_at ?? "");
    if (!inStayWindow(dispensedAt, stay.admittedAt, stay.dischargedAt)) continue;
    lines.push({
      id: String((row as Record<string, unknown>).id),
      source: "pharmacy",
      category: "Pharmacy",
      description: String((row as Record<string, unknown>).drugs ?? "Pharmacy bill"),
      amount: Number((row as Record<string, unknown>).total_cost ?? 0),
      status: String((row as Record<string, unknown>).bill_status ?? "Pending"),
      occurredAt: dispensedAt,
    });
  }

  for (const row of consultationFees ?? []) {
    const consultedAt = String((row as Record<string, unknown>).consulted_at ?? "");
    if (!inStayWindow(consultedAt, stay.admittedAt, stay.dischargedAt)) continue;
    lines.push({
      id: String((row as Record<string, unknown>).id),
      source: "consultation",
      category: "Consultation",
      description: String((row as Record<string, unknown>).consultation_type ?? "Consultation fee"),
      amount: Number((row as Record<string, unknown>).fee ?? 0),
      status: String((row as Record<string, unknown>).status ?? "Pending"),
      occurredAt: consultedAt,
    });
  }

  lines.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  const all = lines.reduce((sum, line) => sum + line.amount, 0);
  const pending = lines.filter((line) => isPendingStatus(line.status)).reduce((sum, line) => sum + line.amount, 0);
  const paid = lines.filter((line) => line.status === "Paid").reduce((sum, line) => sum + line.amount, 0);

  return { stay, lines, totals: { all, pending, paid } };
}

export async function transferInpatientStay(input: {
  patientId: string;
  patientName: string;
  fromUnit: string;
  toUnit: string;
  bed?: string | null;
  wardPatientId?: string | null;
  doctorInCharge?: string | null;
  recordedBy: string;
}): Promise<{ stay: InpatientStay } | { error: string }> {
  await dischargeInpatientStay({
    patientId: input.patientId,
    unit: input.fromUnit,
  }).then((result) => {
    if ("error" in result && result.error !== "Active inpatient stay not found.") {
      console.warn("[transferInpatientStay] discharge:", result.error);
    }
  });

  return createInpatientStay({
    patientId: input.patientId,
    patientName: input.patientName,
    unit: input.toUnit,
    bed: input.bed ?? null,
    wardPatientId: input.wardPatientId ?? null,
    doctorInCharge: input.doctorInCharge ?? null,
    recordedBy: input.recordedBy,
  });
}

export async function listInpatientCharges(stayId: string): Promise<InpatientCharge[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { admin, hospitalId } = scoped;
  const { data, error } = await admin
    .from("inpatient_charges")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("stay_id", stayId)
    .order("recorded_at", { ascending: false });

  if (error) {
    console.error("[listInpatientCharges]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapCharge(row as Record<string, unknown>));
}
