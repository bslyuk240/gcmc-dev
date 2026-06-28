/**
 * HTTP security headers applied by middleware on every response
 * and by next.config.ts for the full Next.js response pipeline.
 *
 * CSP is deliberately strict:
 *   - No 'unsafe-eval'
 *   - 'unsafe-inline' only on style-src (needed for Tailwind CSS-in-JS / Next.js RSC)
 *   - script-src uses 'self' + nonce-based inline allowed via Next.js
 *   - Supabase REST + WebSocket explicitly whitelisted in connect-src
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Extract the Supabase project hostname so we can scope CSP tightly. */
function supabaseOrigin(): string {
  try {
    return new URL(SUPABASE_URL).origin; // e.g. https://vnclbmwrwltkowxtkafu.supabase.co
  } catch {
    return "https://*.supabase.co";
  }
}

function supabaseWs(): string {
  return supabaseOrigin().replace(/^https:/, "wss:");
}

function buildCsp(): string {
  const sb  = supabaseOrigin();
  const sbWs = supabaseWs();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const directives: [string, string][] = [
    // Allow page content only from own origin
    ["default-src",     "'self'"],

    // Scripts: own origin only. Next.js static chunks are self-hosted.
    // 'unsafe-inline' is intentionally absent — Next.js 13+ does not need it for RSC.
    ["script-src",      "'self'"],

    // Styles: allow inline for Tailwind / Next.js style injection
    ["style-src",       "'self' 'unsafe-inline'"],

    // Images: own origin, data URIs (base64 avatars), Supabase Storage, and HTTPS
    ["img-src",         `'self' data: ${sb} https:`],

    // Fonts: own origin and data URIs
    ["font-src",        "'self' data:"],

    // XHR / fetch / WebSocket — Supabase REST + Realtime
    ["connect-src",     `'self' ${sb} ${sbWs}${appUrl ? ` ${appUrl}` : ""}`],

    // Disallow all plugin content (Flash, etc.)
    ["object-src",      "'none'"],

    // Media: own origin only
    ["media-src",       "'self'"],

    // Disallow <base> tag hijacking
    ["base-uri",        "'self'"],

    // Form submissions: own origin only
    ["form-action",     "'self'"],

    // Disallow embedding this app in any frame (clickjacking)
    ["frame-ancestors", "'none'"],

    // Disallow embedding third-party frames in this app
    ["frame-src",       "'none'"],

    // Force HTTPS for all resources (supplements HSTS at the CSP layer)
    ["upgrade-insecure-requests", ""],
  ];

  return directives
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join("; ");
}

export const securityHeaders: Record<string, string> = {
  // ── Clickjacking ───────────────────────────────────────────────────────────
  "X-Frame-Options": "DENY",

  // ── MIME-type sniffing ────────────────────────────────────────────────────
  "X-Content-Type-Options": "nosniff",

  // ── Referrer leakage ─────────────────────────────────────────────────────
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // ── Cross-Origin isolation ────────────────────────────────────────────────
  "Cross-Origin-Opener-Policy":   "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",

  // ── Feature/permissions policy ────────────────────────────────────────────
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "browsing-topics=()",
  ].join(", "),

  // ── Content Security Policy ───────────────────────────────────────────────
  "Content-Security-Policy": buildCsp(),

  // NOTE: Strict-Transport-Security (HSTS) is set in next.config.ts via the
  // `headers()` export, NOT here — middleware runs on every request including
  // HTTP, which makes it the wrong place for HSTS (HSTS must only be sent on
  // HTTPS responses, and next.config.ts headers are applied at the server level
  // after TLS termination).
};
