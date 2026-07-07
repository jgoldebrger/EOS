# Navigation

EOS uses a two-level navigation model: **organization-wide** pages and **team workspaces**.

## Global top navigation

Available on every page when signed into an organization:

| Item | Path | Purpose |
|------|------|---------|
| **Home** | `/home` | Daily dashboard — my work, team pulse, snapshots |
| **Inbox** | `/inbox` | Personal items assigned to you (badge shows unread count) |
| **Activity** | `/activity` | Organization-wide event feed |
| **Reports** | `/reports` | Executive summary and drill-downs |
| **Teams** | `/teams` | Team directory; enter a team workspace |
| **People** | `/people` | Org member directory and People Analyzer |
| **Process** | `/process` | Organization-wide SOP library |
| **Company** | `/company` | Hub for V/TO, accountability, company rocks |
| **Projects** | `/projects` | Project list and workspaces |
| **Transport** | `/transport` | Transport management (loads, dispatch, routing) |

## Team workspace navigation

After selecting a team from **Teams**, the horizontal sub-nav appears:

| Item | Purpose |
|------|---------|
| **Overview** | Team dashboard, L10 rating trend, quick links |
| **People** | Team roster and team-scoped People Analyzer |
| **L10** | Level 10 meeting hub and history |
| **Rocks** | Quarterly team priorities |
| **Scorecards** | Weekly/monthly metrics |
| **To-Dos** | 7-day accountable tasks |
| **Headlines** | Customer and employee wins |
| **Issues** | IDS issue list |
| **Process** | Team-scoped SOP pages |

Team URLs follow this pattern:

```
/org/[orgSlug]/teams/[teamSlug]/[section]
```

During a **live L10 meeting**, team sub-navigation is hidden so the team can focus on the agenda. Use **Exit to L10 hub** to return to the meeting list.

## Create menu (+)

When you are inside a team context, the **Create** menu (top bar) offers quick links to add:

- Metric (scorecard)
- Rock
- Issue
- To-do
- Headline
- L10 meeting
- Project

Creation requires appropriate permissions (see [Roles & Permissions](./roles-and-permissions.md)).

## Global search

Press **Ctrl+K** or **Cmd+K** anywhere in the app to open search.

Search finds:

- Navigation shortcuts (jump to Home, Teams, V/TO, etc.)
- Projects and work items
- Transport loads

## Account menu

Top-right avatar menu:

| Item | Purpose |
|------|---------|
| **Your profile** | Display name and notification preferences |
| **Settings** | Organization settings hub |
| **Help** | Full product documentation |
| **Sign out** | End your session |

## Company hub

**Company** is a landing page linking to:

- **V/TO** — Vision/Traction Organizer
- **Accountability** — Seat chart
- **Process** — Org SOP library (same as global Process nav)
- **Company Rocks** — Organization-level quarterly priorities
- **Meetings** — Cross-team L10 meeting list
- **People Analyzer** — Org-wide quarterly reviews

## Legacy URLs

These org-level paths redirect to your first team workspace:

- `/org/[slug]/rocks` → team rocks
- `/org/[slug]/issues` → team issues
- `/org/[slug]/todos` → team todos
- `/org/[slug]/scorecard` → org scorecard rollup (does not redirect; executive view)

## Tips

- Bookmark your team **L10** page for weekly meetings.
- Use **Inbox** as your action center for assignments and cascades.
- **Activity** is best for auditors and admins reviewing what changed.
