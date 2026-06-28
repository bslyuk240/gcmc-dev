"use client";

import { ACCOUNTS_PAYMENT_UPDATED_EVENT } from "@/lib/constants/accounts-events";
import type {
  BillingChargeLine,
  BillingLedgerEntry,
  BillingReportSummary,
  CashDeskQueue,
  DayClosureSummary,
  PatientLedgerSummary,
  PatientSearchResult,
} from "@/modules/billing/types";

export function notifyBillingUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNTS_PAYMENT_UPDATED_EVENT));
  }
}

export async function fetchCashDeskQueue(input?: {
  department?: string;
  patientId?: string;
}): Promise<CashDeskQueue> {
  const params = new URLSearchParams();
  if (input?.department) params.set("department", input.department);
  if (input?.patientId) params.set("patientId", input.patientId);
  const res = await fetch(`/api/billing/cash-desk?${params.toString()}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load queue.");
  return res.json();
}

export async function fetchPatientSearch(q: string): Promise<PatientSearchResult[]> {
  const res = await fetch(`/api/billing/patients?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Search failed.");
  const data = await res.json();
  return data.patients as PatientSearchResult[];
}

export async function fetchPatientLedger(patientId: string): Promise<PatientLedgerSummary> {
  const res = await fetch(`/api/billing/patients/${encodeURIComponent(patientId)}/ledger`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load ledger.");
  const data = await res.json();
  return data.ledger as PatientLedgerSummary;
}

export async function postBillingPayment(input: {
  chargeLineIds: string[];
  method: string;
  reference?: string;
  notes?: string;
}) {
  const res = await fetch("/api/billing/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chargeLineIds: input.chargeLineIds,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Payment failed.");
  notifyBillingUpdated();
  return data as { paymentId: string; paymentNumber: string; totalAmount: number };
}

export async function postBillingWaive(input: { chargeLineId: string; reason: string }) {
  const res = await fetch("/api/billing/adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Waiver failed.");
  notifyBillingUpdated();
  return data;
}

export async function fetchBillingLedger(input?: { start?: string; end?: string }): Promise<BillingLedgerEntry[]> {
  const params = new URLSearchParams();
  if (input?.start) params.set("start", input.start);
  if (input?.end) params.set("end", input.end);
  const res = await fetch(`/api/billing/ledger?${params.toString()}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load ledger.");
  const data = await res.json();
  return data.entries as BillingLedgerEntry[];
}

export async function fetchBillingReport(input?: { start?: string; end?: string }): Promise<BillingReportSummary> {
  const params = new URLSearchParams();
  if (input?.start) params.set("start", input.start);
  if (input?.end) params.set("end", input.end);
  const res = await fetch(`/api/billing/reports?${params.toString()}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load report.");
  const data = await res.json();
  return data.summary as BillingReportSummary;
}

export async function fetchDayClose(date?: string): Promise<DayClosureSummary> {
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`/api/billing/day-close${params}`);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load day close.");
  const data = await res.json();
  return data.summary as DayClosureSummary;
}

export async function postDayClose(input: { countedCash: number; businessDate?: string }) {
  const res = await fetch("/api/billing/day-close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Day close failed.");
  notifyBillingUpdated();
  return data.summary as DayClosureSummary;
}

export function groupLinesByPatient(lines: BillingChargeLine[]) {
  const map = new Map<string, { patientId: string; patientName: string; lines: BillingChargeLine[]; balance: number }>();
  for (const line of lines) {
    const existing = map.get(line.patientId) ?? {
      patientId: line.patientId,
      patientName: line.patientName,
      lines: [],
      balance: 0,
    };
    existing.lines.push(line);
    existing.balance += line.balanceDue;
    map.set(line.patientId, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
}

export function money(value: number) {
  return `₦${value.toLocaleString()}`;
}
