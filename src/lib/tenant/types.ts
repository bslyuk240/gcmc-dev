export type HospitalStatus = "active" | "suspended" | "provisioning";

export type HospitalPlan = "starter" | "standard" | "enterprise";

/** Tenant branding and receipt settings stored in hospitals.settings JSONB. */
export type HospitalSettings = {
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  receipt_tagline?: string;
  receipt_footer?: string;
  timezone?: string;
};

export type Hospital = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  status: HospitalStatus;
  plan: HospitalPlan;
  settings: HospitalSettings;
  created_at: string;
  updated_at: string;
};

export type PlatformAdmin = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
