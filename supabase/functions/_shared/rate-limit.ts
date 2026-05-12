/**
 * Sliding window rate limiting via Upstash Redis pipeline.
 * Uses sorted sets: ZREMRANGEBYSCORE + ZADD + ZCARD + EXPIRE in one HTTP call.
 * Falls back to allow-all if Redis is not configured or errors.
 */

interface RateLimitOptions {
  identifier: string;
  limit: number;
  windowMs: number;
}

export async function checkRateLimit(
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { identifier, limit, windowMs } = options;

  const UPSTASH_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('[RateLimit] Upstash not configured, allowing request');
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const windowStart = now - windowMs;
  const windowSeconds = Math.ceil(windowMs / 1000);
  const key = `rl:${identifier}`;

  try {
    // Single pipeline call: remove expired → add current → count → set TTL
    const response = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['ZREMRANGEBYSCORE', key, '-inf', windowStart],
        ['ZADD', key, now, String(now)],
        ['ZCARD', key],
        ['EXPIRE', key, windowSeconds],
      ]),
    });

    const results = await response.json();
    // results[2] is ZCARD response: { result: <count> }
    const count: number = results?.[2]?.result ?? 0;

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = now + windowMs;

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }
}

export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;

  return 'unknown';
}
