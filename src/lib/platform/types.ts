export type PlatformAuditAction =
  | "login"
  | "hospital.create"
  | "hospital.update"
  | "hospital.suspend"
  | "hospital.activate"
  | "hospital.provision_admin"
  | "hospital.onboard_approve"
  | "hospital.signup_rejected"
  | "invoice.create"
  | "invoice.send"
  | "invoice.paid"
  | "invoice.void"
  | "settings.update"
  | "platform.staff_created"
  | "platform.staff_updated"
  | "platform.tenant.enter"
  | "subscription.create"
  | "subscription.update"
  | "email.test_sent";

export type HospitalSubscriptionStatus = "trial" | "active" | "expired" | "cancelled";
export type HospitalBillingCycle = "monthly" | "yearly";

export type HospitalSubscription = {
  id: string;
  hospital_id: string;
  plan: string;
  status: HospitalSubscriptionStatus;
  billing_cycle: HospitalBillingCycle;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
