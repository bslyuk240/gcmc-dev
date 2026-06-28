import type { NextConfig } from "next";

/**
 * Build the Content-Security-Policy string at config time.
 * next.config.ts runs in Node.js, so process.env is available.
 * Supabase origins are scoped to the project URL rather than a wildcard.
 */
function buildCsp(): string {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let sbOrigin = "https://*.supabase.co";
  let sbWs     = "wss://*.supabase.co";
  try {
    const u = new URL(sbUrl);
    sbOrigin = u.origin;                                 // e.g. https://abc123.supabase.co
    sbWs     = u.origin.replace(/^https:/, "wss:");     // e.g. wss://abc123.supabase.co
  } catch { /* fall back to safe wildcards if URL is malformed */ }

  const directives: [string, string][] = [
    ["default-src",               "'self'"],
    // No 'unsafe-eval' — Next.js static bundles do not require it.
    // 'unsafe-inline' removed from script-src; Next.js RSC does not need it.
    ["script-src",                "'self'"],
    // Tailwind and Next.js inject style tags at runtime — unsafe-inline needed for styles only.
    ["style-src",                 "'self' 'unsafe-inline'"],
    // Supabase Storage for avatars / uploads; data: for base64 thumbnails.
    ["img-src",                   `'self' data: ${sbOrigin} https:`],
    ["font-src",                  "'self' data:"],
    // Supabase REST (https) + Realtime (wss) — both scoped to the project, not wildcard.
    ["connect-src",               `'self' ${sbOrigin} ${sbWs}`],
    ["object-src",                "'none'"],
    ["media-src",                 "'self'"],
    ["base-uri",                  "'self'"],
    ["form-action",               "'self'"],
    // No third-party frames allowed; prevents embedding HMS in iframes (clickjacking).
    ["frame-ancestors",           "'none'"],
    ["frame-src",                 "'none'"],
    // Upgrade HTTP sub-resource requests to HTTPS (defense-in-depth alongside HSTS).
    ["upgrade-insecure-requests", ""],
  ];

  return directives.map(([k, v]) => (v ? `${k} ${v}` : k)).join("; ");
}

/**
 * Security headers applied at the Next.js server level — AFTER TLS termination.
 * This is the correct layer for HSTS (it must only be served over HTTPS).
 * Middleware also applies a subset of these for edge-cached responses.
 */
const HTTP_SECURITY_HEADERS = [
  // ── HSTS ──────────────────────────────────────────────────────────────────
  // 2-year max-age; includeSubDomains covers *.skolahq.com tenants; preload-eligible.
  // IMPORTANT: only enable after confirming all subdomains serve HTTPS.
  {
    key:   "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // ── Framing / clickjacking ─────────────────────────────────────────────────
  { key: "X-Frame-Options",            value: "DENY" },

  // ── MIME sniffing ─────────────────────────────────────────────────────────
  { key: "X-Content-Type-Options",     value: "nosniff" },

  // ── Referrer leakage ─────────────────────────────────────────────────────
  { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },

  // ── Cross-Origin isolation ────────────────────────────────────────────────
  { key: "Cross-Origin-Opener-Policy",    value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy",  value: "same-origin" },

  // ── Permissions / feature policy ─────────────────────────────────────────
  {
    key:   "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },

  // ── Content-Security-Policy ───────────────────────────────────────────────
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        // Apply to every route (static assets, API routes, pages).
        // These headers are set at the Next.js server layer — after TLS termination —
        // which makes it safe to include HSTS here.
        source: "/(.*)",
        headers: HTTP_SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
