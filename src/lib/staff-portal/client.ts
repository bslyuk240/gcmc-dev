"use client";

import type {
  GeneratedPayslip,
  LeaveYearPolicy,
  StaffDashboardSummary,
  StaffDocument,
} from "@/modules/staff-portal/types";

export const STAFF_PORTAL_UPDATED_EVENT = "staff-portal-updated";

export function notifyStaffPortalUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STAFF_PORTAL_UPDATED_EVENT));
  }
}

async function parseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? "Request failed.");
}

export async function fetchStaffDashboard(): Promise<StaffDashboardSummary> {
  const res = await fetch("/api/staff-portal/dashboard");
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchMyPayslips(): Promise<GeneratedPayslip[]> {
  const res = await fetch("/api/staff-portal/payslips");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.payslips as GeneratedPayslip[];
}

export async function fetchStaffLeavePolicies(): Promise<LeaveYearPolicy[]> {
  const res = await fetch("/api/staff-portal/leave/policies");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.policies as LeaveYearPolicy[];
}

export async function fetchMyDocuments(): Promise<StaffDocument[]> {
  const res = await fetch("/api/staff-portal/documents");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.documents as StaffDocument[];
}

export async function fetchMyLeaveRequests() {
  const res = await fetch("/api/leave/requests?mine=1");
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.requests;
}

export async function fetchStaffProfileDetails() {
  const res = await fetch("/api/staff-portal/profile");
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchStaffDocumentDownloadUrl(documentId: string): Promise<string> {
  const res = await fetch(`/api/staff-portal/documents/${documentId}/download`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.url as string;
}

export async function submitLeaveRequest(input: {
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}) {
  const res = await fetch("/api/leave/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await parseError(res);
  notifyStaffPortalUpdated();
  return res.json();
}
