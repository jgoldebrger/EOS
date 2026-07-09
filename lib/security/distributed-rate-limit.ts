import { checkRateLimit, type RateLimitResult } from "@/lib/security/rate-limit";

async function upstashFixedWindow(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    return null;
  }

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const bucketKey = `ratelimit:${key}:${Math.floor(Date.now() / windowMs)}`;

  try {
    const response = await fetch(`${baseUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["EXPIRE", bucketKey, windowSec],
      ]),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{ result?: number }>;
    const count = payload[0]?.result ?? 0;

    if (count > limit) {
      return { allowed: false, retryAfterSeconds: windowSec };
    }

    return { allowed: true };
  } catch {
    return null;
  }
}

/** Distributed rate limit with in-memory fallback when Upstash is not configured. */
export async function checkDistributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const distributed = await upstashFixedWindow(key, limit, windowMs);
  if (distributed) {
    return distributed;
  }

  return checkRateLimit(key, limit, windowMs);
}
