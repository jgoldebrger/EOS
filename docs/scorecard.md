# Scorecard

Scorecards track weekly (or monthly/quarterly) metrics that tell you whether the business is on track.

## Team scorecard

**Path:** `/org/[slug]/teams/[teamSlug]/scorecard`

### Key concepts

| Term | Meaning |
|------|---------|
| **Measurable** | A single metric row (for example "Weekly revenue") |
| **Goal** | Target value; cells turn green/yellow/red based on performance |
| **Period** | Time column (week, month, or quarter) |
| **Owner** | Person accountable for the metric |
| **Category** | Grouping for long scorecards |
| **Formula metric** | Calculated from other metrics |

### Toolbar actions

- **Add metric** — create a new measurable.
- **Categories** — organize metrics into sections.
- **Filters** — by owner, category, tags.
- **Group by** — owner or team.
- **Period** — switch weekly / monthly / quarterly views.

### Entering values

Click a cell to enter the value for that period. Values save automatically.

- **Time metrics** — enter as hours:minutes for duration-style measurables.
- **Formula metrics** — computed automatically from dependencies.

### During L10

The scorecard section in a live L10 meeting shows the same table. Update off-track metrics in real time.

### AI analysis

Click **Analyze** to get AI suggestions for metric insights. Approve or reject each suggestion before it applies. See [AI Assistant](./ai-assistant.md).

---

## Org scorecard rollup

**Path:** `/org/[slug]/scorecard`

Executive view across all teams:

- Green / yellow / red summary per team.
- Drill down into any team's scorecard.

Use this for leadership reviews without opening each team individually.

---

## Permissions

- **View:** all org roles including viewer.
- **Edit values:** owner, admin, member.
- **Create/reassign metrics:** org admin; or team leader/member on that team.

## Best practices

- Limit to 5–15 measurables per team.
- Every metric has one accountable owner.
- Review off-track (red/yellow) metrics every L10.
- Use categories to separate sales, operations, and finance rows.
