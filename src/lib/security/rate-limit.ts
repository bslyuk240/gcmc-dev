type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function prune(key: string, now: number): Bucket {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + LOGIN_WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return existing;
}

/** Simple in-memory login rate limit (per IP + email). Use Redis in multi-instance prod. */
export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = prune(key, now);

  if (bucket.count >= LOGIN_LIMIT) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function loginRateLimitKey(ip: string | null, email: string): string {
  return `login:${ip ?? "unknown"}:${email.trim().toLowerCase()}`;
}
