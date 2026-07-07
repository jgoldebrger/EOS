# Teams

Teams are the core organizational unit in EOS. Most traction tools (rocks, scorecard, issues, L10) are scoped to a team.

## Team directory

**Path:** `/org/[slug]/teams`

Lists all teams you can access.

- **Org owners and admins** see every team and can **create teams**.
- **Members** see only teams they belong to.

Click a team card to enter its workspace.

### Create a team (admin)

1. Go to **Teams**.
2. Click **Create team**.
3. Enter team name and slug.
4. Add members from the org directory with team roles (leader, member, viewer).

---

## Team workspace

Each team has its own sub-navigation (Overview, People, L10, Rocks, etc.). See [Navigation](./navigation.md).

### Overview

**Path:** `/org/[slug]/teams/[teamSlug]/overview`

- L10 meeting rating trend chart.
- Quick links to all traction tools.
- **Run L10** button to start or resume a meeting.

### People (team roster)

**Path:** `/org/[slug]/teams/[teamSlug]/people`

- View team members and roles.
- **Leaders and admins** can add or remove members and change team roles.
- Includes team-scoped **People Analyzer** reviews.

---

## Team naming

- **Name** — display name (for example "Leadership Team").
- **Slug** — URL segment (for example `leadership` → `/teams/leadership/...`).

Slugs are set at creation and used in all team links.

## Best practices

- Align teams with your EOS accountability chart seats or departments.
- Keep leadership team separate from departmental teams.
- Ensure every team has at least one **leader** for roster management.
- Run L10 weekly per team from the team's **L10** hub.
