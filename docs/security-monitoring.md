# Security monitoring and WAF

## Recommended alerts

Configure in your observability platform (Datadog, Sentry, Vercel Analytics, Supabase Logs):

| Signal | Threshold | Action |
|--------|-----------|--------|
| Auth sign-in failures | Spike vs 7-day baseline | Investigate credential stuffing |
| HTTP 429 responses | Sustained > 50/min on `/auth` | Review rate-limit keys / enable WAF |
| RLS permission denied | Unusual volume from single user | Possible IDOR probe |
| Edge function `rate_limited` | Any sustained pattern | Review AI abuse |

## Vercel Firewall / WAF

1. Enable Vercel Firewall on the production project (Pro/Enterprise).
2. Add bot protection on `/auth/*` and `/api/*`.
3. Optionally place Cloudflare in front of the custom domain for additional DDoS protection.

## Supabase logs

Monitor Auth logs in Supabase Dashboard → Logs for:

- Repeated `invalid_credentials`
- Unusual OAuth callback errors
- MFA challenge failures

## Application rate limits

The app uses distributed rate limiting when these env vars are set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Without Upstash, limits are best-effort per server instance.

## Error monitoring (Sentry)

Set `NEXT_PUBLIC_SENTRY_DSN` in production to enable [`instrumentation.ts`](../instrumentation.ts) error capture. Configure alerts in Sentry for:

- Unhandled server exceptions (`error` level)
- Auth callback failures (tag `auth`)
- Edge function invocation failures reported by the Next.js app
