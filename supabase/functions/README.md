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

Shared helpers: [`_shared/edge-utils.ts`](./_shared/edge-utils.ts)

Deploy:

```bash
npx supabase functions deploy analyze-scorecard
# ... repeat for each function
```
