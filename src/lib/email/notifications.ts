import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "@/lib/config/app";
import { sendEmail } from "@/lib/email/send";
import { getPlatformSettings } from "@/lib/platform/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTenantAdminClient } from "@/lib/supabase/admin-tenant";
import type { HospitalStatus } from "@/lib/tenant/types";

type EmailRow = {
  label: string;
  value: string | number | null | undefined;
};

type BasicEmailInput = {
  to: string | string[];
  subject: string;
  title: string;
  intro: string;
  rows?: EmailRow[];
  cta?: { label: string; href: string };
  footer?: string;
};

type HospitalSummary = {
  id: string;
  slug: string;
  name: string;
  settings: { email?: string | null } | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function dedupeEmails(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map(normalizeEmail).filter((email): email is string => Boolean(email))),
  );
}

function absoluteUrl(path: string): string {
  const base = appConfig.appUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function tenantUrl(hospitalSlug: string | null | undefined, path: string): string {
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (hospitalSlug && appDomain) {
    const protocol = appConfig.appUrl.startsWith("http://") ? "http" : "https";
    return `${protocol}://${hospitalSlug}.${appDomain}${suffix}`;
  }
  return absoluteUrl(suffix);
}

function formatMoneyKobo(value: number | null | undefined, currency = "NGN"): string {
  const amount = Number(value ?? 0) / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderBasicEmail(input: BasicEmailInput): { html: string; text: string } {
  const rows = input.rows?.filter((row) => row.value !== null && row.value !== undefined && row.value !== "") ?? [];
  const rowHtml = rows
    .map((row) => `
      <tr>
        <td style="padding:8px 0;color:#64748b;font-size:13px;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(String(row.value))}</td>
      </tr>
    `)
    .join("");

  const ctaHtml = input.cta
    ? `
      <div style="margin-top:24px;">
        <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;padding:11px 16px;font-size:14px;font-weight:700;">
          ${escapeHtml(input.cta.label)}
        </a>
      </div>
    `
    : "";

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="padding:24px 28px;border-bottom:1px solid #e2e8f0;">
          <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(appConfig.appName)}</div>
          <h1 style="margin:10px 0 0;color:#0f172a;font-size:22px;line-height:1.3;">${escapeHtml(input.title)}</h1>
        </div>
        <div style="padding:24px 28px;">
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">${escapeHtml(input.intro)}</p>
          ${rows.length ? `<table style="width:100%;border-collapse:collapse;margin-top:18px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${rowHtml}</table>` : ""}
          ${ctaHtml}
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">${escapeHtml(input.footer ?? "This is an automated operational notification.")}</p>
        </div>
      </div>
    </div>
  `;

  const textRows = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
  const text = [
    input.title,
    "",
    input.intro,
    textRows ? `\n${textRows}` : "",
    input.cta ? `\n${input.cta.label}: ${input.cta.href}` : "",
    `\n${input.footer ?? "This is an automated operational notification."}`,
  ].join("\n");

  return { html, text };
}

async function sendOperationalEmail(input: BasicEmailInput): Promise<void> {
  const to = Array.isArray(input.to) ? dedupeEmails(input.to) : dedupeEmails([input.to]);
  if (to.length === 0) return;

  const content = renderBasicEmail({ ...input, to });
  const result = await sendEmail({
    to,
    subject: input.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.ok) {
    console.error("[email-notification]", input.subject, result.error);
  }
}

async function maybeSend(input: BasicEmailInput): Promise<void> {
  try {
    await sendOperationalEmail(input);
  } catch (error) {
    console.error("[email-notification]", input.subject, error);
  }
}

async function getPlatformAdminEmails(): Promise<string[]> {
  const db = createAdminClient();
  if (!db) return [];

  const [{ data: platformRows }, { data: profileRows }] = await Promise.all([
    db.from("platform_admins").select("email").eq("is_active", true),
    db
      .from("staff_profiles")
      .select("email")
      .in("role", ["platform_admin"])
      .eq("is_active", true),
  ]);

  return dedupeEmails([
    ...(platformRows ?? []).map((row) => row.email),
    ...(profileRows ?? []).map((row) => row.email),
  ]);
}

async function getHospitalById(db: SupabaseClient, hospitalId: string): Promise<HospitalSummary | null> {
  const { data } = await db
    .from("hospitals")
    .select("id, slug, name, settings")
    .eq("id", hospitalId)
    .maybeSingle();

  if (!data) return null;
  const settings = data.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
    ? data.settings as HospitalSummary["settings"]
    : null;
  return {
    id: String(data.id),
    slug: String(data.slug),
    name: String(data.name),
    settings,
  };
}

async function getHospitalAdminEmails(db: SupabaseClient, hospitalId: string): Promise<string[]> {
  const { data } = await db
    .from("staff_profiles")
    .select("email")
    .eq("hospital_id", hospitalId)
    .eq("department", "admin")
    .eq("is_active", true);

  return dedupeEmails((data ?? []).map((row) => row.email));
}

async function getHospitalContactEmails(db: SupabaseClient, hospitalId: string): Promise<string[]> {
  const hospital = await getHospitalById(db, hospitalId);
  const adminEmails = await getHospitalAdminEmails(db, hospitalId);
  return dedupeEmails([hospital?.settings?.email, ...adminEmails]);
}

async function getStaffEmail(staffId: string): Promise<string | null> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return null;

  const { data } = await scoped.admin
    .from("staff_profiles")
    .select("email")
    .eq("hospital_id", scoped.hospitalId)
    .eq("id", staffId)
    .maybeSingle();

  return normalizeEmail(data?.email);
}

async function getDepartmentEmails(department: string): Promise<string[]> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return [];

  const { data } = await scoped.admin
    .from("staff_profiles")
    .select("email")
    .eq("hospital_id", scoped.hospitalId)
    .eq("department", department)
    .eq("is_active", true);

  return dedupeEmails((data ?? []).map((row) => row.email));
}

async function getTenantName(): Promise<string> {
  const scoped = await createTenantAdminClient();
  if (!scoped) return appConfig.appName;
  const hospital = await getHospitalById(scoped.admin, scoped.hospitalId);
  return hospital?.name ?? appConfig.appName;
}

export async function notifyHospitalSignupSubmitted(input: {
  hospitalName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
}): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.notif_new_tenant) return;

  await maybeSend({
    to: await getPlatformAdminEmails(),
    subject: `New hospital signup: ${input.hospitalName}`,
    title: "New hospital signup request",
    intro: `${input.ownerName} submitted a tenant signup request for ${input.hospitalName}.`,
    rows: [
      { label: "Hospital", value: input.hospitalName },
      { label: "Slug", value: input.slug },
      { label: "Plan", value: input.plan },
      { label: "Owner email", value: input.ownerEmail },
    ],
    cta: { label: "Review signup", href: absoluteUrl("/platform/approvals") },
  });
}

export async function notifyHospitalSignupApproved(input: {
  hospitalName: string;
  hospitalSlug: string;
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
}): Promise<void> {
  await maybeSend({
    to: input.ownerEmail,
    subject: `${input.hospitalName} has been approved`,
    title: "Your hospital workspace is ready",
    intro: `Hello ${input.ownerName}, your ${input.hospitalName} workspace has been approved and your administrator account has been created.`,
    rows: [
      { label: "Login email", value: input.ownerEmail },
      { label: "Temporary password", value: input.tempPassword },
      { label: "Workspace", value: input.hospitalSlug },
    ],
    cta: { label: "Open hospital portal", href: tenantUrl(input.hospitalSlug, "/login") },
    footer: "You will be asked to change this temporary password after signing in.",
  });
}

export async function notifyHospitalSignupRejected(input: {
  hospitalName: string;
  ownerName: string;
  ownerEmail: string;
  reason?: string | null;
}): Promise<void> {
  await maybeSend({
    to: input.ownerEmail,
    subject: `Signup update for ${input.hospitalName}`,
    title: "Hospital signup request update",
    intro: `Hello ${input.ownerName}, your signup request for ${input.hospitalName} was not approved at this time.`,
    rows: [{ label: "Reason", value: input.reason || "Not specified" }],
    cta: { label: "Contact support", href: absoluteUrl("/contact") },
  });
}

export async function notifyHospitalAdminProvisioned(input: {
  hospitalId: string;
  fullName: string;
  email: string;
  tempPassword: string;
}): Promise<void> {
  const db = createAdminClient();
  if (!db) return;
  const hospital = await getHospitalById(db, input.hospitalId);

  await maybeSend({
    to: input.email,
    subject: `${hospital?.name ?? "Hospital"} admin account created`,
    title: "Hospital administrator account created",
    intro: `Hello ${input.fullName}, an administrator account has been created for you.`,
    rows: [
      { label: "Hospital", value: hospital?.name },
      { label: "Login email", value: input.email },
      { label: "Temporary password", value: input.tempPassword },
    ],
    cta: { label: "Open hospital portal", href: tenantUrl(hospital?.slug, "/login") },
    footer: "You will be asked to change this temporary password after signing in.",
  });
}

export async function notifyPlatformStaffCreated(input: {
  fullName: string;
  email: string;
  role: string;
  tempPassword: string;
}): Promise<void> {
  await maybeSend({
    to: input.email,
    subject: "Platform account created",
    title: "Platform account created",
    intro: `Hello ${input.fullName}, a platform console account has been created for you.`,
    rows: [
      { label: "Role", value: input.role },
      { label: "Login email", value: input.email },
      { label: "Temporary password", value: input.tempPassword },
    ],
    cta: { label: "Open platform console", href: absoluteUrl("/platform") },
    footer: "You will be asked to change this temporary password after signing in.",
  });
}

export async function notifyPlatformInvoiceSent(input: {
  hospitalId: string;
  invoiceNumber: string;
  amountKobo: number;
  currency?: string;
  dueDate: string;
}): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.notif_payment) return;

  const db = createAdminClient();
  if (!db) return;
  const hospital = await getHospitalById(db, input.hospitalId);

  await maybeSend({
    to: await getHospitalContactEmails(db, input.hospitalId),
    subject: `Invoice ${input.invoiceNumber} from ${settings.platform_name}`,
    title: "Subscription invoice sent",
    intro: `A subscription invoice has been issued for ${hospital?.name ?? "your hospital"}.`,
    rows: [
      { label: "Invoice", value: input.invoiceNumber },
      { label: "Amount", value: formatMoneyKobo(input.amountKobo, input.currency) },
      { label: "Due date", value: input.dueDate },
    ],
    cta: { label: "Open billing", href: tenantUrl(hospital?.slug, "/app/admin/billing") },
  });
}

export async function notifyPlatformPaymentReceived(input: {
  hospitalId: string;
  invoiceNumber?: string | null;
  amountKobo: number;
  currency?: string;
  reference?: string | null;
}): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.notif_payment) return;

  const db = createAdminClient();
  if (!db) return;
  const hospital = await getHospitalById(db, input.hospitalId);

  await maybeSend({
    to: [
      ...(await getHospitalContactEmails(db, input.hospitalId)),
      ...(await getPlatformAdminEmails()),
    ],
    subject: `Payment received${input.invoiceNumber ? ` for ${input.invoiceNumber}` : ""}`,
    title: "Subscription payment received",
    intro: `A subscription payment has been recorded for ${hospital?.name ?? "a hospital tenant"}.`,
    rows: [
      { label: "Hospital", value: hospital?.name },
      { label: "Invoice", value: input.invoiceNumber },
      { label: "Amount", value: formatMoneyKobo(input.amountKobo, input.currency) },
      { label: "Reference", value: input.reference },
    ],
    cta: { label: "Open platform billing", href: absoluteUrl("/platform/billing") },
  });
}

export async function notifyHospitalStatusChanged(input: {
  hospitalId: string;
  status: HospitalStatus;
}): Promise<void> {
  const settings = await getPlatformSettings();
  if (!settings.notif_system_alerts) return;

  const db = createAdminClient();
  if (!db) return;
  const hospital = await getHospitalById(db, input.hospitalId);

  await maybeSend({
    to: await getHospitalContactEmails(db, input.hospitalId),
    subject: `${hospital?.name ?? "Hospital"} status changed to ${input.status}`,
    title: "Hospital account status changed",
    intro: `Your hospital account status is now ${input.status}.`,
    rows: [
      { label: "Hospital", value: hospital?.name },
      { label: "Status", value: input.status },
    ],
    cta: { label: "Open portal", href: tenantUrl(hospital?.slug, "/login") },
  });
}

export async function notifyStaffAccountCreated(input: {
  fullName: string;
  email: string;
  department: string;
  role: string;
  tempPassword: string;
  hospitalSlug?: string | null;
}): Promise<void> {
  await maybeSend({
    to: input.email,
    subject: "Hospital staff account created",
    title: "Staff account created",
    intro: `Hello ${input.fullName}, your staff account has been created.`,
    rows: [
      { label: "Department", value: input.department },
      { label: "Role", value: input.role },
      { label: "Login email", value: input.email },
      { label: "Temporary password", value: input.tempPassword },
    ],
    cta: { label: "Open staff portal", href: tenantUrl(input.hospitalSlug, "/staff/login") },
    footer: "You will be asked to change this temporary password after signing in.",
  });
}

export async function notifyLeaveSubmitted(input: {
  staffName: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}): Promise<void> {
  const recipients = dedupeEmails([
    ...(await getDepartmentEmails("hr")),
    ...(await getDepartmentEmails(input.department)),
  ]);
  await maybeSend({
    to: recipients,
    subject: `Leave request submitted by ${input.staffName}`,
    title: "Leave request submitted",
    intro: `${input.staffName} submitted a leave request for review.`,
    rows: [
      { label: "Department", value: input.department },
      { label: "Leave type", value: input.leaveType },
      { label: "Dates", value: `${input.startDate} to ${input.endDate}` },
      { label: "Days", value: input.days },
    ],
    cta: { label: "Review leave", href: absoluteUrl("/app/hr/leave-management") },
  });
}

export async function notifyLeaveReviewed(input: {
  staffId: string;
  status: string;
  leaveType: string;
  reviewerName?: string;
  notes?: string;
}): Promise<void> {
  await maybeSend({
    to: await getStaffEmail(input.staffId) ?? "",
    subject: `Leave request ${input.status.toLowerCase()}`,
    title: `Leave request ${input.status.toLowerCase()}`,
    intro: `Your ${input.leaveType} leave request has been ${input.status.toLowerCase()}.`,
    rows: [
      { label: "Reviewed by", value: input.reviewerName },
      { label: "Note", value: input.notes },
    ],
    cta: { label: "Open staff leave", href: absoluteUrl("/staff/leave") },
  });
}

export async function notifyRotaSwapSubmitted(input: {
  staffName: string;
  department: string;
  shiftDate: string;
  shiftType: string;
}): Promise<void> {
  await maybeSend({
    to: await getDepartmentEmails(input.department),
    subject: `Rota swap request from ${input.staffName}`,
    title: "Rota swap request submitted",
    intro: `${input.staffName} requested a rota swap.`,
    rows: [
      { label: "Department", value: input.department },
      { label: "Shift date", value: input.shiftDate },
      { label: "Shift type", value: input.shiftType },
    ],
    cta: { label: "Review rota requests", href: absoluteUrl("/app/hr/rota") },
  });
}

export async function notifyRotaSwapReviewed(input: {
  staffId: string;
  status: string;
  shiftDate: string;
  reviewNote?: string | null;
}): Promise<void> {
  await maybeSend({
    to: await getStaffEmail(input.staffId) ?? "",
    subject: `Rota swap ${input.status}`,
    title: `Rota swap ${input.status}`,
    intro: `Your rota swap request for ${input.shiftDate} has been ${input.status}.`,
    rows: [{ label: "Review note", value: input.reviewNote }],
    cta: { label: "Open my rota", href: absoluteUrl("/staff/my-rota") },
  });
}

export async function notifyWorkforceTaskAssigned(input: {
  assigneeId?: string;
  assigneeName?: string;
  title: string;
  unitName: string;
  priority?: string;
  dueAt?: string;
}): Promise<void> {
  if (!input.assigneeId) return;
  await maybeSend({
    to: await getStaffEmail(input.assigneeId) ?? "",
    subject: `Task assigned: ${input.title}`,
    title: "New task assigned",
    intro: `${input.assigneeName ?? "You"} have been assigned a workforce task.`,
    rows: [
      { label: "Task", value: input.title },
      { label: "Unit", value: input.unitName },
      { label: "Priority", value: input.priority },
      { label: "Due", value: input.dueAt },
    ],
    cta: { label: "Open tasks", href: absoluteUrl("/staff/tasks") },
  });
}

export async function notifyWorkforceTaskStatusChanged(input: {
  title: string;
  status: string;
  unitName: string;
}): Promise<void> {
  if (input.status !== "completed") return;
  await maybeSend({
    to: await getDepartmentEmails("admin"),
    subject: `Task completed: ${input.title}`,
    title: "Workforce task completed",
    intro: `A workforce task in ${input.unitName} has been marked completed.`,
    rows: [
      { label: "Task", value: input.title },
      { label: "Status", value: input.status },
    ],
    cta: { label: "Open workforce", href: absoluteUrl("/app/admin/workforce") },
  });
}

export async function notifyItTicketCreated(input: {
  ticketRef: string;
  title: string;
  priority: string;
  openedBy: string;
  assignedToId?: string | null;
}): Promise<void> {
  const assignedEmail = input.assignedToId ? await getStaffEmail(input.assignedToId) : null;
  await maybeSend({
    to: assignedEmail ? [assignedEmail] : await getDepartmentEmails("it"),
    subject: `IT ticket ${input.ticketRef}: ${input.title}`,
    title: "IT ticket created",
    intro: `${input.openedBy} opened an IT ticket.`,
    rows: [
      { label: "Ticket", value: input.ticketRef },
      { label: "Priority", value: input.priority },
    ],
    cta: { label: "Open IT tickets", href: absoluteUrl("/app/it/tickets") },
  });
}

export async function notifyItTicketUpdated(input: {
  ticketRef: string;
  title: string;
  status: string;
  openedById?: string | null;
  assignedToId?: string | null;
}): Promise<void> {
  const recipients = dedupeEmails([
    input.openedById ? await getStaffEmail(input.openedById) : null,
    input.assignedToId ? await getStaffEmail(input.assignedToId) : null,
  ]);
  await maybeSend({
    to: recipients,
    subject: `IT ticket ${input.ticketRef} updated`,
    title: "IT ticket updated",
    intro: `The IT ticket "${input.title}" is now ${input.status}.`,
    rows: [
      { label: "Ticket", value: input.ticketRef },
      { label: "Status", value: input.status },
    ],
    cta: { label: "Open IT tickets", href: absoluteUrl("/app/it/tickets") },
  });
}

export async function notifyDepartmentWorkflow(input: {
  toDepartments: string[];
  subject: string;
  title: string;
  intro: string;
  rows?: EmailRow[];
  href: string;
}): Promise<void> {
  const groups = await Promise.all(input.toDepartments.map((department) => getDepartmentEmails(department)));
  await maybeSend({
    to: dedupeEmails(groups.flat()),
    subject: input.subject,
    title: input.title,
    intro: input.intro,
    rows: input.rows,
    cta: { label: "Open workspace", href: absoluteUrl(input.href) },
    footer: `Sent from ${await getTenantName()}.`,
  });
}

export async function notifyPerformanceReviewSubmitted(input: {
  staffId: string;
  staffName: string;
  periodLabel: string;
  overallRating: number | null;
  reviewerName: string;
}): Promise<void> {
  await maybeSend({
    to: await getStaffEmail(input.staffId) ?? "",
    subject: `Performance review submitted: ${input.periodLabel}`,
    title: "Performance review submitted",
    intro: `${input.reviewerName} submitted your performance review.`,
    rows: [
      { label: "Staff", value: input.staffName },
      { label: "Period", value: input.periodLabel },
      { label: "Rating", value: input.overallRating },
    ],
    cta: { label: "Open performance review", href: absoluteUrl("/staff/performance") },
    footer: `Sent from ${await getTenantName()}.`,
  });
}

export async function notifyPerformanceReviewAcknowledged(input: {
  staffName: string;
  department: string;
  periodLabel: string;
}): Promise<void> {
  await notifyDepartmentWorkflow({
    toDepartments: [input.department, "hr"],
    subject: `Performance review acknowledged: ${input.staffName}`,
    title: "Performance review acknowledged",
    intro: `${input.staffName} acknowledged a submitted performance review.`,
    rows: [
      { label: "Staff", value: input.staffName },
      { label: "Period", value: input.periodLabel },
    ],
    href: "/app/hr/performance",
  });
}
