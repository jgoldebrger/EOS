# Edge Functions

All functions use [`@supabase/server`](https://github.com/supabase/server) with `withSupabase` for auth, CORS, and Supabase clients.

| Function | Auth mode | Description |
|----------|-----------|-------------|
| `analyze-scorecard` | `user` | AI scorecard insights |
| `dedupe-issues` | `user` | AI issue merge suggestions |
| `extract-todos` | `user` | AI todo extraction |
| `summarize-meeting` | `user` | AI meeting summary |
| `validate-sso-membership` | `user` | SSO auto-join validation |
| `discover-sso-provider` | `publishable` | Pre-login SSO discovery (`verify_jwt = false`) |
| `send-notifications` | `secret` | Branded HTML email via Resend (L10 recap, cascades, assignments, reminders) |
| `l10-schedule-reminders` | `secret` | Hourly cron — inbox + email reminders for recurring L10 schedules |
| `scorecard-off-track-digest` | `secret` | Weekly cron — inbox + email digest of off-track metrics to owners |
| `optimize-routes` | `user` | VROOM route optimization proxy |
| `run-transport-analysis` | `user` | Ferrobus isochrone worker proxy |

Set secrets: `.\scripts\push-resend-secrets.ps1` (reads `RESEND_API_KEY` + `NOTIFICATION_FROM_EMAIL` from `.env.local`).

Domain setup: `.\scripts\setup-resend-domain.ps1` — add DNS records in Resend, then re-run when verified.

Smoke test: `.\scripts\smoke-test-notification.ps1` or Settings → Notifications in the app.

Rotate API key: `.\scripts\rotate-resend-key.ps1`

Cursor agents can also use Resend's hosted MCP (`https://mcp.resend.com`) — see [`.cursor/mcp.json`](../.cursor/mcp.json).

Shared helpers: [`_shared/edge-utils.ts`](./_shared/edge-utils.ts)

All `auth: 'user'` functions set `verify_jwt = false` in `config.toml` so Supabase platform JWT (legacy HS256) does not block `@supabase/server` JWKS verification for publishable-key sessions.

Deploy:

```bash
npx supabase functions deploy analyze-scorecard
# ... repeat for each function
```
