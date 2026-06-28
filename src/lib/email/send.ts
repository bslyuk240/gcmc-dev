import "server-only";

import { getResendApiKey, resolveEmailSender } from "@/lib/email/config";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; from: string }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not set in environment variables." };
  }

  const sender = await resolveEmailSender();
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: sender.fromHeader,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: sender.replyTo ?? undefined,
  });

  if (error) {
    return { ok: false, error: String(error.message ?? error) };
  }

  return { ok: true, from: sender.fromEmail };
}
