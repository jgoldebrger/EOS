# Getting Started

This guide walks you through signing in, creating your organization, and taking your first steps in EOS.

## Sign in

1. Go to your EOS URL (for example `https://your-app.vercel.app`).
2. Click **Sign in** on the landing page.
3. Enter your email and password, or use **Google** / **Microsoft** if your administrator has enabled OAuth.

If you do not have an account, ask your organization administrator for an invite, or create a new organization (see below).

## Create a new organization

If you are setting up EOS for the first time:

1. Sign in or register at `/auth`.
2. You are redirected to **Onboarding**.
3. **Step 1 — Organization:** Enter your company name. A URL slug is generated automatically (for example `acme` → `/org/acme/...`).
4. **Step 2 — First team (optional):** Create your leadership or first departmental team. You can skip this and add teams later from **Teams**.
5. Click **Finish** to land on your **Home** dashboard.

You become the **owner** of the new organization with full administrative access.

## First steps after onboarding

| Step | Where | Why |
|------|-------|-----|
| Invite your team | **People** or **Settings → Members** | Others need accounts to collaborate |
| Create teams | **Teams** | EOS traction tools are team-scoped |
| Set L10 agenda timings | **Settings → L10 agenda** | Default meeting time boxes |
| Add people to teams | Team → **People** | Team members see team workspaces |
| Build your accountability chart | **Company → Accountability** | Defines seats for People Analyzer |
| Enter your V/TO | **Company → V/TO** | Vision and traction planning |

## Understanding your workspace URL

Every page lives under:

```
/org/[your-org-slug]/...
```

Examples:

- Home: `/org/acme/home`
- Team L10: `/org/acme/teams/leadership/l10`
- Settings: `/org/acme/settings`

Bookmark your org home page for quick access.

## Profile and notifications

Open the account menu (top right) → **Your profile** to:

- Update your **display name** (shown on scorecards, issues, and people lists).
- Configure **email notification preferences** (assignments, L10 recap, weekly digest).

In-app **Inbox** notifications are always on regardless of email settings.

## Getting help

- Press **Ctrl+K** (Windows) or **Cmd+K** (Mac) for global search.
- Open **Help** from the account menu for full documentation.
- Contact your organization **owner** or **admin** for access issues.

## Common questions

**I was invited but cannot sign in.**  
Check that you use the same email address the invite was sent to. Reset your password from the sign-in page if needed.

**I see “You do not have access.”**  
Your account may not be a member of this organization. Ask an admin to add you under **People** or **Settings → Members**.

**Where did Scorecard / Rocks / Issues go?**  
These tools live inside **team workspaces**. Go to **Teams**, select a team, then use the team sub-navigation.

**What is the difference between Home and Dashboard?**  
`/dashboard` redirects to `/home`. Use **Home** as your daily starting point.
