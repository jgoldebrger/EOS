import { checkDistributedRateLimit } from "@/lib/security/distributed-rate-limit";

export type ActionRateLimitError = { error: string };

/** Per-user server action rate limit (distributed when Upstash is configured). */
export async function requireActionRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<ActionRateLimitError | null> {
  const result = await checkDistributedRateLimit(
    `action:${action}:${userId}`,
    limit,
    windowMs,
  );
  if (!result.allowed) {
    return {
      error: `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
    };
  }
  return null;
}
