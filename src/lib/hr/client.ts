"use client";

import type { StaffDocument } from "@/modules/staff-portal/types";

export const HR_UPDATED_EVENT = "hr-updated";

export function notifyHrUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HR_UPDATED_EVENT));
  }
}

async function parseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? "Request failed.");
}

export async function fetchHrStaffDocuments(staffId?: string): Promise<StaffDocument[]> {
  const params = staffId ? `?staffId=${encodeURIComponent(staffId)}` : "";
  const res = await fetch(`/api/staff-portal/documents${params}`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.documents as StaffDocument[];
}

export async function createHrStaffDocument(input: {
  staffId: string;
  title: string;
  category: string;
  issuedOn?: string;
  expiryDate?: string;
  notes?: string;
  file?: File;
}) {
  let storagePath: string | undefined;
  let fileName: string | undefined;

  if (input.file) {
    const form = new FormData();
    form.append("staffId", input.staffId);
    form.append("file", input.file);
    const uploadRes = await fetch("/api/staff-portal/documents/upload", {
      method: "POST",
      body: form,
    });
    if (!uploadRes.ok) await parseError(uploadRes);
    const uploadData = await uploadRes.json();
    storagePath = uploadData.storagePath as string;
    fileName = uploadData.fileName as string;
  }

  const res = await fetch("/api/staff-portal/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId: input.staffId,
      title: input.title,
      category: input.category,
      issuedOn: input.issuedOn,
      expiryDate: input.expiryDate,
      notes: input.notes,
      storagePath,
      fileName,
    }),
  });
  if (!res.ok) await parseError(res);
  notifyHrUpdated();
  const data = await res.json();
  return data.document as StaffDocument;
}

export async function fetchStaffDocumentDownloadUrl(documentId: string): Promise<string> {
  const res = await fetch(`/api/staff-portal/documents/${documentId}/download`);
  if (!res.ok) await parseError(res);
  const data = await res.json();
  return data.url as string;
}

export async function fetchStaffProfileDetails() {
  const res = await fetch("/api/staff-portal/profile");
  if (!res.ok) await parseError(res);
  return res.json();
}
