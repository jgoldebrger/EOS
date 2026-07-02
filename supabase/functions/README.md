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
| `optimize-routes` | `user` | VROOM route optimization proxy |
| `run-transport-analysis` | `user` | Ferrobus isochrone worker proxy |

Shared helpers: [`_shared/edge-utils.ts`](./_shared/edge-utils.ts)

All `auth: 'user'` functions set `verify_jwt = false` in `config.toml` so Supabase platform JWT (legacy HS256) does not block `@supabase/server` JWKS verification for publishable-key sessions.

Deploy:

```bash
npx supabase functions deploy analyze-scorecard
# ... repeat for each function
```
