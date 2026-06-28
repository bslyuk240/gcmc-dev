import type { StaffDocument } from "@/modules/staff-portal/types";

function documentStatus(expiryDate?: string | null): StaffDocument["status"] {
  if (!expiryDate) return "Valid";
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return "Valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return "Expired";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  if (expiry <= soon) return "Expiring Soon";
  return "Valid";
}

export function mapStaffDocument(row: Record<string, unknown>): StaffDocument {
  const expiry = row.expiry_date != null ? String(row.expiry_date).slice(0, 10) : undefined;
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category ?? "Other"),
    issuedOn: row.issued_on != null ? String(row.issued_on).slice(0, 10) : undefined,
    expiryDate: expiry,
    fileName: row.file_name != null ? String(row.file_name) : undefined,
    storagePath: row.storage_path != null ? String(row.storage_path) : undefined,
    status: documentStatus(expiry),
  };
}
