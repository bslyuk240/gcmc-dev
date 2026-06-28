import type { NextRequest } from "next/server";
import { GCMC_HOSPITAL_SLUG } from "@/lib/tenant/constants";

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Subdomains that are reserved for platform/infrastructure use.
 * These must never resolve to a hospital tenant.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "admin", "app", "platform", "mail", "smtp",
  "assets", "static", "cdn", "status", "docs", "help", "support",
]);

function normalizeSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const slug = value.trim().toLowerCase();
  return SLUG_PATTERN.test(slug) ? slug : null;
}

/** Extract tenant slug from hostname when using subdomains (e.g. gcmc.skolahq.com). */
export function resolveTenantSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (!hostname) return null;

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN?.toLowerCase();

  if (appDomain) {
    // Root domain (e.g. skolahq.com) — this is the platform, not a tenant.
    if (hostname === appDomain) return null;
    // www subdomain — treat same as root.
    if (hostname === `www.${appDomain}`) return null;

    // Wildcard tenant subdomain: gcmc.skolahq.com
    if (hostname.endsWith(`.${appDomain}`)) {
      const sub = hostname.slice(0, -(appDomain.length + 1));
      if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
        return normalizeSlug(sub);
      }
      return null; // reserved or nested subdomain — treat as platform
    }
  }

  // localhost subdomains (dev only): gcmc.localhost
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) {
      return normalizeSlug(sub);
    }
  }

  return null;
}

/** Path-based tenant: /t/gcmc/... */
export function resolveTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/t\/([a-z0-9-]+)(\/|$)/i);
  return match ? normalizeSlug(match[1]) : null;
}

/**
 * Resolve tenant slug for the current request.
 * Order: subdomain → path prefix → DEFAULT_HOSPITAL_SLUG env (dev only).
 *
 * Returns null on the root/platform domain — callers must handle null explicitly.
 * In production, never falls back to a hardcoded tenant.
 */
export function resolveTenantSlug(request: NextRequest): string | null {
  const host = request.headers.get("host") ?? "";
  return (
    resolveTenantSlugFromHost(host) ??
    resolveTenantSlugFromPath(request.nextUrl.pathname) ??
    // Dev-only fallback: DEFAULT_HOSPITAL_SLUG or GCMC. Never used in production.
    (process.env.NODE_ENV !== "production"
      ? normalizeSlug(process.env.DEFAULT_HOSPITAL_SLUG) ?? GCMC_HOSPITAL_SLUG
      : null)
  );
}

export function sessionMatchesTenant(
  session: { hospital_slug?: string } | null,
  tenantSlug: string,
): boolean {
  if (!session?.hospital_slug) return false;
  return session.hospital_slug === tenantSlug;
}
