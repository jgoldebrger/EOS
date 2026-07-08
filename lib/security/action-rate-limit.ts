import { checkRateLimit } from "@/lib/security/rate-limit";

export type ActionRateLimitError = { error: string };

/** Per-user server action rate limit (best-effort, per instance). */
export function requireActionRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number,
): ActionRateLimitError | null {
  const result = checkRateLimit(`action:${action}:${userId}`, limit, windowMs);
  if (!result.allowed) {
    return {
      error: `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
    };
  }
  return null;
}
