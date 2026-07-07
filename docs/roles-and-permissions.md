# Roles & Permissions

EOS uses organization roles and team roles to control who can view and edit data.

## Organization roles

| Role | Summary |
|------|---------|
| **Owner** | Full control including SSO configuration. At least one owner per org. |
| **Admin** | Full org management except SSO edit (can view SSO settings). |
| **Member** | Can use traction tools, run L10 meetings, submit People Analyzer reviews. |
| **Viewer** | Read-only access to shared workspaces. Cannot create or edit. |

### What each org role can do

| Capability | Owner | Admin | Member | Viewer |
|------------|-------|-------|--------|--------|
| View all org pages | ✓ | ✓ | ✓ | ✓ |
| Edit traction data (rocks, issues, etc.) | ✓ | ✓ | ✓ | — |
| Run / facilitate L10 | ✓ | ✓ | ✓ | — |
| Manage org members & roles | ✓ | ✓ | — | — |
| Edit V/TO and accountability chart | ✓ | ✓ | — | — |
| Edit org Process library | ✓ | ✓ | — | — |
| Create company rocks | ✓ | ✓ | — | — |
| Create teams | ✓ | ✓ | — | — |
| View audit log | ✓ | ✓ | — | — |
| Configure SSO | ✓ | — | — | — |
| Submit People Analyzer reviews | ✓ | ✓ | ✓ | — |

## Team roles

Each person on a team has a team role:

| Role | Summary |
|------|---------|
| **Leader** | Manage team roster; edit team Process pages (with org admin). |
| **Member** | Full participation in team traction tools. |
| **Viewer** | Read-only within the team (rare; usually org viewer covers this). |

### Team access rules

- **Org owners and admins** can open any team workspace, even if not on the roster (treated as viewer for team-specific actions).
- **Org members** must be on a team's roster to access that team workspace.
- If you are not on any team and not an admin, visiting a team URL redirects you to **Teams**.

## Create vs edit

**Edit** (update existing items): org owner, admin, or member.

**Create** (new rocks, issues, todos, headlines): requires one of:

- Org **owner** or **admin**, or
- Team **leader** on at least one team in the org

Org **members** who are only team **members** (not leaders) can edit existing items but cannot use the Create menu to add new ones.

## Scorecard permissions

Managing scorecard metrics (create, reassign, edit structure):

- Org **admin** — always
- Team **leader** or **member** — on that team's scorecard

Viewers cannot edit metrics.

## Process / SOP permissions

| Library | Who can edit |
|---------|--------------|
| Organization Process (`/process`) | Owner, admin |
| Team Process (`/teams/.../process`) | Owner, admin, or team leader |

Everyone with org access can view published SOP pages.

## Settings access

| Page | Who can access |
|------|----------------|
| Settings hub | All org members |
| Members management | Owner, admin |
| Audit log | Owner, admin |
| L10 agenda timings | View: all; Edit: owner, admin |
| Notifications smoke test | Owner, admin |
| Security / SSO | View: owner, admin; Edit SSO: **owner only** |

## Changing roles

**Organization role:** Owner or admin → **Settings → Members** → change role dropdown → save.

**Team role:** Owner, admin, or team leader → Team → **People** → change team role.

## Best practices

- Give **viewer** to executives who need read-only dashboards.
- Make each team have at least one **leader** who can manage roster and Process.
- Keep at least two **owners** for business continuity.
- Use **admin** for IT and operations leads who should not own SSO keys.
