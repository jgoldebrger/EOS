# Process & SOPs

Process libraries store standard operating procedures (SOPs) for how work gets done.

## Organization process library

**Path:** `/org/[slug]/process`

Company-wide SOP pages organized in a hierarchy.

- **View:** all org members.
- **Edit:** owner or admin.

### Health banner

The org process page shows a health summary (coverage, stale pages) to encourage documentation hygiene.

### Browse and search

- Navigate the page tree.
- Filter by category and tags.
- Open any page to read steps and tasks.

---

## Team process library

**Path:** `/org/[slug]/teams/[teamSlug]/process`

Team-specific SOPs (for example "Weekly L10 prep" or "Customer onboarding").

- **Edit:** org admin or team **leader**.

---

## SOP page structure

Each process page can include:

| Element | Purpose |
|---------|---------|
| **Steps** | Ordered procedure steps |
| **Tasks** | Checklist items within steps |
| **Subtasks** | Nested checklist detail |
| **Images** | Screenshots and diagrams |
| **Seat links** | Tie steps to accountability seats |

---

## SOP editor

**Path:** `.../process/[pageId]/edit`

1. Open a process page you have permission to edit.
2. Click **Edit**.
3. Add or reorder steps and tasks.
4. Upload images where helpful.
5. Save — changes are visible immediately to readers.

### Export

Export SOP pages to **PDF** or **DOCX** for offline distribution.

---

## Standalone SOP Designer

A separate offline tool lives at `/sop-designer/` in the public folder. It is not connected to the main Process module — use it for drafting, then copy content into EOS process pages.

---

## Best practices

- One SOP per repeatable process.
- Review SOPs quarterly in L10 or process review meetings.
- Link seats so People Analyzer and training stay aligned.
