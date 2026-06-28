"use server";

import { guardPlatformAction } from "@/lib/platform/guard-action";
import { logPlatformAudit } from "@/lib/platform/audit";
import { resolveEmailSender } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";

export async function sendTestEmailAction(toEmail: string) {
  return guardPlatformAction(async ({ profile }) => {
    const recipient = toEmail.trim();
    if (!recipient) {
      return { success: false, error: "Enter a recipient email first." };
    }

    const sender = await resolveEmailSender();
    const result = await sendEmail({
      to: recipient,
      subject: "HMS Platform — Test Email",
      html: `
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px;">
          <div style="background:#6366f1;width:48px;height:48px;border-radius:12px;margin-bottom:20px;display:flex;align-items:center;justify-content:center;">
            <span style="color:white;font-size:20px;font-weight:bold;">H</span>
          </div>
          <h1 style="color:#1e293b;font-size:20px;margin:0 0 12px;">Test email successful ✓</h1>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
            This is a test email from <strong>${sender.fromName}</strong>. Your Resend email integration is working correctly.
          </p>
          <p style="color:#94a3b8;font-size:12px;margin:0;">Sent by ${profile.full_name ?? "Platform Admin"} via HMS Platform admin console.</p>
        </div>
      `,
    });

    if (!result.ok) return { success: false, error: result.error };

    await logPlatformAudit({
      action: "email.test_sent",
      actorId: profile.id,
      entityType: "email",
      payload: { to: recipient, from: result.from, source: sender.source },
    });

    return { success: true, data: { from: result.from } };
  });
}

export async function getEmailSenderPreviewAction() {
  return guardPlatformAction(async () => {
    const sender = await resolveEmailSender();
    return {
      success: true as const,
      data: {
        fromName: sender.fromName,
        fromEmail: sender.fromEmail,
        replyTo: sender.replyTo,
        source: sender.source,
      },
    };
  });
}
