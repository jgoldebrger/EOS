# Notifications

EOS delivers notifications in-app and optionally by email.

## In-app inbox (always on)

Every assignment, cascade, and L10 reminder creates an **inbox item**. See [Home, Inbox & Activity](./home-and-inbox.md).

Inbox works regardless of email preferences.

---

## Email notifications

Email is optional and controlled per user.

### Configure your preferences

**Path:** `/org/[slug]/profile` → **Notifications**

| Preference | When email is sent |
|------------|-------------------|
| **Assignments** | To-do or issue assigned to you; cascade messages |
| **L10 recap** | After an L10 ends; L10 schedule reminders |
| **Weekly digest** | People review reminders (when enabled by admin) |

### What triggers email

| Event | Email type |
|-------|------------|
| To-do/issue assigned | Assignment |
| L10 meeting ends | L10 recap |
| Cascade sent | Assignment (if enabled) |
| Recurring L10 reminder | L10 reminder |
| People review reminder | Weekly digest preference |

---

## For administrators

### Notification settings

**Path:** `/org/[slug]/settings/notifications`

- Verify `SUPABASE_SECRET_KEY` is configured on the deployment.
- Run **Send test email to me** to smoke-test the production path.

### Email infrastructure

- Resend API keys live on **Supabase Edge Functions** (not Vercel).
- Vercel needs `SUPABASE_SECRET_KEY` so server actions can call the notification edge function.
- Configure sending domain in Resend for delivery to all users (sandbox sender only delivers to your Resend account email).

See repository scripts: `scripts/push-resend-secrets.ps1`, `scripts/setup-resend-domain.ps1`.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| No email received | Profile preferences; spam folder; Resend domain verification |
| Inbox works, email does not | Admin smoke test; Vercel `SUPABASE_SECRET_KEY` |
| Only account owner gets email | Resend sandbox sender — verify custom domain |

In-app inbox should always work when assignments are created.
