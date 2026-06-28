/**
 * Print / Download receipt utility
 * Opens a styled print window — no external PDF library required.
 * Works as print-to-PDF in all modern browsers.
 */

import type { ReceiptBranding } from "@/lib/tenant/branding";
import { escapeHtml } from "@/lib/tenant/branding";
import { getClientReceiptBranding } from "@/lib/tenant/branding-store";

export type ReceiptLine = { label: string; value: string; bold?: boolean };

export interface ReceiptOptions {
  title: string;
  subtitle?: string;
  refNumber?: string;
  date?: string;
  lines: ReceiptLine[];
  total?: { label: string; value: string };
  footer?: string;
  copyLabel?: string;
  branding?: ReceiptBranding;
}

function resolveBranding(opts: ReceiptOptions): ReceiptBranding {
  return opts.branding ?? getClientReceiptBranding();
}

function buildReceiptHTML(opts: ReceiptOptions): string {
  const brand = resolveBranding(opts);
  const hospitalName = escapeHtml(brand.name);
  const hospitalTag = escapeHtml(brand.receiptTagline);
  const hospitalAddr = escapeHtml(brand.address);
  const hospitalTel = escapeHtml(brand.phone);
  const hospitalEmail = escapeHtml(brand.email);
  const poweredBy = escapeHtml(`${brand.shortName} Internal Portal`);

  const now = opts.date ?? new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const rows = opts.lines.map((l) => `
    <tr>
      <td style="padding:5px 0;color:#64748b;font-size:13px;">${escapeHtml(l.label)}</td>
      <td style="padding:5px 0;text-align:right;font-size:13px;font-weight:${l.bold ? "700" : "500"};color:#0f172a;">${escapeHtml(l.value)}</td>
    </tr>`).join("");

  const totalRow = opts.total ? `
    <tr style="border-top:2px solid #0f172a;">
      <td style="padding:10px 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(opts.total.label)}</td>
      <td style="padding:10px 0 4px;text-align:right;font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(opts.total.value)}</td>
    </tr>` : "";

  const defaultFooter = brand.receiptFooter
    ? escapeHtml(brand.receiptFooter)
    : `Thank you for choosing <strong>${hospitalName}</strong>.<br/>Keep this receipt for your records.`;

  const footerHtml = opts.footer
    ? escapeHtml(opts.footer)
    : defaultFooter;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(opts.title)} — ${hospitalName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:20px}
    .receipt{background:#fff;width:420px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
    .header{background:#1e3a5f;color:#fff;padding:22px 24px 18px;text-align:center}
    .header h1{font-size:17px;font-weight:800;letter-spacing:.5px}
    .header p{font-size:11px;opacity:.75;margin-top:2px}
    .header .addr{font-size:10px;opacity:.6;margin-top:6px;line-height:1.5}
    .copy-badge{display:inline-block;margin-top:10px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:2px 12px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase}
    .body{padding:20px 24px}
    .receipt-title{font-size:16px;font-weight:800;color:#0f172a;margin-bottom:2px}
    .receipt-sub{font-size:12px;color:#64748b;margin-bottom:12px}
    .meta{display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0}
    table{width:100%;border-collapse:collapse}
    .divider{border:none;border-top:1px dashed #e2e8f0;margin:12px 0}
    .footer-note{margin-top:18px;padding:10px 12px;background:#f8fafc;border-radius:8px;font-size:11px;color:#64748b;text-align:center;line-height:1.5}
    .powered{text-align:center;font-size:10px;color:#cbd5e1;margin-top:14px;padding-bottom:4px}
    @media print{
      body{background:#fff;padding:0}
      .receipt{box-shadow:none;border-radius:0;width:100%}
      .no-print{display:none}
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${hospitalName}</h1>
      <p>${hospitalTag}</p>
      <div class="addr">${hospitalAddr}<br/>${hospitalTel} · ${hospitalEmail}</div>
      ${opts.copyLabel ? `<div class="copy-badge">${escapeHtml(opts.copyLabel)}</div>` : ""}
    </div>
    <div class="body">
      <div class="receipt-title">${escapeHtml(opts.title)}</div>
      ${opts.subtitle ? `<div class="receipt-sub">${escapeHtml(opts.subtitle)}</div>` : ""}
      <div class="meta">
        <span>Date: ${escapeHtml(now)}</span>
        ${opts.refNumber ? `<span>Ref: <strong style="color:#0f172a">${escapeHtml(opts.refNumber)}</strong></span>` : ""}
      </div>
      <table>${rows}${totalRow}</table>
      <hr class="divider"/>
      <div class="footer-note">${footerHtml}</div>
    </div>
    <div class="powered">Powered by ${poweredBy} · ${new Date().getFullYear()}</div>
  </div>
  <script>
    window.onload = function(){ window.print(); }
  </script>
</body>
</html>`;
}

/** Opens a print window with the receipt. Closes after printing. */
export function printReceipt(opts: ReceiptOptions): void {
  const html = buildReceiptHTML(opts);
  const win = window.open("", "_blank", "width=500,height=700,scrollbars=yes");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/** Downloads the receipt as an HTML file (useful for archiving). */
export function downloadReceiptHTML(opts: ReceiptOptions, filename: string): void {
  const html = buildReceiptHTML({ ...opts, copyLabel: opts.copyLabel ?? "PATIENT COPY" });
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export { escapeHtml };
