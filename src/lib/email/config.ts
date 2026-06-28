import "server-only";

import { getPlatformSettings } from "@/lib/platform/settings";

export type EmailSender = {
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  fromHeader: string;
  source: "mail_from_env" | "email_from_env" | "platform_settings" | "default";
};

function parseMailFrom(value: string): { name: string | null; email: string } {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1].replace(/^["']|["']$/g, "").trim();
    return { name: name || null, email: angleMatch[2].trim() };
  }
  return { name: null, email: trimmed };
}

/** Resolve the outbound sender. Env vars override platform settings. */
export async function resolveEmailSender(): Promise<EmailSender> {
  const settings = await getPlatformSettings();

  let fromName: string;
  let fromEmail: string;
  let source: EmailSender["source"];

  const mailFrom = process.env.MAIL_FROM?.trim();
  if (mailFrom) {
    const parsed = parseMailFrom(mailFrom);
    fromEmail = parsed.email;
    fromName =
      parsed.name ??
      process.env.EMAIL_FROM_NAME?.trim() ??
      settings.email_from_name ??
      "HMS Platform";
    source = "mail_from_env";
  } else if (process.env.EMAIL_FROM_ADDRESS?.trim()) {
    fromEmail = process.env.EMAIL_FROM_ADDRESS.trim();
    fromName =
      process.env.EMAIL_FROM_NAME?.trim() ??
      settings.email_from_name ??
      "HMS Platform";
    source = "email_from_env";
  } else if (settings.email_from_address) {
    fromEmail = settings.email_from_address;
    fromName = settings.email_from_name || "HMS Platform";
    source = "platform_settings";
  } else {
    fromEmail = "noreply@hmsplatform.com";
    fromName = "HMS Platform";
    source = "default";
  }

  const replyTo =
    settings.email_reply_to?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    null;

  return {
    fromName,
    fromEmail,
    replyTo,
    fromHeader: `${fromName} <${fromEmail}>`,
    source,
  };
}

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}
