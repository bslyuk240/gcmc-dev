import type { Hospital, HospitalSettings } from "@/lib/tenant/types";

/** Client-safe branding snapshot passed through TenantProvider. */
export type TenantBranding = {
  hospitalId: string;
  slug: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  receiptTagline: string;
  receiptFooter: string;
  logoUrl: string | null;
  timezone: string;
  updatedAt: string;
};

export const DEFAULT_BRANDING: TenantBranding = {
  hospitalId: "",
  slug: "gcmc",
  name: "Group Christian Medical Centre",
  shortName: "GCMC",
  address: "12 Hospital Avenue, Lagos, Nigeria",
  phone: "+234 801 234 5678",
  email: "info@gcmc.ng",
  receiptTagline: "Quality Healthcare You Can Trust",
  receiptFooter: "",
  logoUrl: null,
  timezone: "(GMT+01:00) West Africa Time",
  updatedAt: "",
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function hospitalToBranding(hospital: Hospital): TenantBranding {
  const s = hospital.settings ?? {};
  return {
    hospitalId: hospital.id,
    slug: hospital.slug,
    name: hospital.name,
    shortName: hospital.short_name ?? hospital.name.slice(0, 4).toUpperCase(),
    address: s.address ?? DEFAULT_BRANDING.address,
    phone: s.phone ?? DEFAULT_BRANDING.phone,
    email: s.email ?? DEFAULT_BRANDING.email,
    receiptTagline: s.receipt_tagline ?? DEFAULT_BRANDING.receiptTagline,
    receiptFooter: s.receipt_footer ?? "",
    logoUrl: s.logo_url ?? null,
    timezone: s.timezone ?? DEFAULT_BRANDING.timezone,
    updatedAt: hospital.updated_at,
  };
}

/** Subset used by print receipts. */
export type ReceiptBranding = Pick<
  TenantBranding,
  "name" | "shortName" | "address" | "phone" | "email" | "receiptTagline" | "receiptFooter"
>;

export function toReceiptBranding(branding: TenantBranding): ReceiptBranding {
  return {
    name: branding.name,
    shortName: branding.shortName,
    address: branding.address,
    phone: branding.phone,
    email: branding.email,
    receiptTagline: branding.receiptTagline,
    receiptFooter: branding.receiptFooter,
  };
}

/** Whitelist for hospital settings updates (mass-assignment protection). */
export type HospitalSettingsInput = {
  address?: string;
  phone?: string;
  email?: string;
  receipt_tagline?: string;
  receipt_footer?: string;
  timezone?: string;
  logo_url?: string | null;
};

export function sanitizeSettingsInput(
  input: HospitalSettingsInput,
): HospitalSettings {
  const out: HospitalSettings = {};
  if (input.address !== undefined) out.address = input.address.trim().slice(0, 500);
  if (input.phone !== undefined) out.phone = input.phone.trim().slice(0, 50);
  if (input.email !== undefined) out.email = input.email.trim().slice(0, 200);
  if (input.receipt_tagline !== undefined) {
    out.receipt_tagline = input.receipt_tagline.trim().slice(0, 200);
  }
  if (input.receipt_footer !== undefined) {
    out.receipt_footer = input.receipt_footer.trim().slice(0, 500);
  }
  if (input.timezone !== undefined) out.timezone = input.timezone.trim().slice(0, 100);
  if (input.logo_url !== undefined) out.logo_url = input.logo_url ?? undefined;
  return out;
}
