import type { InpatientStay } from "@/lib/inpatient/types";

export async function resolveActiveInpatientStayId(
  patientId: string,
): Promise<string | null> {
  const res = await fetch(
    `/api/inpatient/stays?status=active&patientId=${encodeURIComponent(patientId)}`,
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.stays?.[0]?.id ?? null;
}

export async function openInpatientStay(input: {
  patientId: string;
  patientName: string;
  unit: string;
  bed?: string | null;
  admissionOrderId?: string | null;
  wardPatientId?: string | null;
  doctorInCharge?: string | null;
}): Promise<{ stay: InpatientStay } | { error: string }> {
  const res = await fetch("/api/inpatient/stays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) return { error: data?.error ?? "Could not open inpatient stay." };
  return { stay: data.stay as InpatientStay };
}

export async function dischargeInpatientStay(input: {
  patientId: string;
  unit: string;
}): Promise<void> {
  await fetch("/api/inpatient/stays", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "discharge",
      patientId: input.patientId,
      unit: input.unit,
    }),
  });
}

export async function transferInpatientStay(input: {
  patientId: string;
  patientName: string;
  fromUnit: string;
  toUnit: string;
  bed?: string | null;
  wardPatientId?: string | null;
  doctorInCharge?: string | null;
}): Promise<{ error?: string }> {
  const res = await fetch("/api/inpatient/stays", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "transfer",
      ...input,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error ?? "Could not transfer inpatient stay." };
  }
  return {};
}

export async function recordInpatientConsumable(input: {
  stayId: string;
  description: string;
  quantity: number;
  unitAmount: number;
}): Promise<{ error?: string }> {
  const res = await fetch("/api/inpatient/charges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stayId: input.stayId,
      chargeType: "consumable",
      description: input.description,
      quantity: input.quantity,
      unitAmount: input.unitAmount,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error ?? "Could not record consumable." };
  }
  return {};
}
