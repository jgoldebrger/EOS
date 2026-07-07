# L10 Meetings

The Level 10 (L10) meeting is the weekly heartbeat of EOS. EOS runs the full L10 agenda with timed sections, embedded traction tools, and meeting history.

## L10 hub

**Path:** `/org/[slug]/teams/[teamSlug]/l10`

### Hub features

- **Agenda preview** — section names and time boxes from org defaults.
- **Resume in progress** — banner when a meeting is already running.
- **Recurring schedule** — set day, time, timezone, and reminder hours (team members get inbox reminders).
- **Meeting history** — upcoming/active and past meetings.

### Start a meeting

1. Open team **L10**.
2. Click **Create L10** (or **Resume** if one is in progress).
3. The live meeting opens at `/l10/[meetingId]`.

---

## Default agenda

| Section | Default time | Purpose |
|---------|--------------|---------|
| Segue | 5 min | Personal/business best check-in |
| Scorecard | 5 min | Review metrics on/off track |
| Rocks | 5 min | Quarterly priorities on/off track |
| Headlines | 5 min | Customer and employee wins |
| To-Dos | 5 min | Review 7-day task list |
| Issues (IDS) | 60 min | Identify, Discuss, Solve |
| Conclude | 5 min | Recap, cascading messages, rating |

Admins customize timings at **Settings → L10 agenda**.

---

## Live meeting

**Path:** `/org/[slug]/teams/[teamSlug]/l10/[meetingId]`

### Facilitator controls

- **Active section** — changing the section updates all participants in real time.
- **Section timer** — synced countdown per section; shows overtime when expired.
- **Extend time** — add minutes to the current section if needed.

### Section embeds

Traction sections embed the real workspace:

- **Scorecard** — full metric table; update values during the meeting.
- **Rocks** — review on/off track status.
- **Headlines** — add wins during the meeting.
- **To-Dos** — check off and add tasks.
- **Issues** — IDS with priority, parking lot, Top 3 filter.

### Notes and decisions

- **Section notes** — auto-saved notes per agenda section.
- **Decisions log** — record decisions made during the meeting.

### Segue prompts

Rotating personal and business-best questions appear in the Segue section (configured in **Settings → L10 agenda**).

### Conclude

- **Cascading messages checklist** — messages to share with other teams.
- **End meeting** — closes the meeting and prompts for team rating (1–10).

### AI during meetings

- **Summarize** — AI-generated meeting summary from notes (approve before applying).
- **Extract to-dos** — pull action items from notes into suggestions.

See [AI Assistant](./ai-assistant.md).

---

## Meeting recap

**Path:** `/org/[slug]/teams/[teamSlug]/l10/[meetingId]/recap`

After ending a meeting:

- View summary, decisions, and ratings.
- Review and approve AI suggestions.
- L10 recap email sent to participants (if enabled in profile preferences).

---

## Recurring schedule

On the L10 hub, configure **Recurring schedule**:

1. Enable recurring L10.
2. Set **day of week** and **time** (with timezone).
3. Set **reminder hours before** (default 24 hours).

Team members receive **inbox reminders** (and optional email) before each occurrence.

Reminders are sent hourly by a **GitHub Actions** workflow (not Vercel cron). Vercel Hobby plans only allow daily cron jobs, so production uses `.github/workflows/l10-schedule-reminders.yml` with `SUPABASE_SECRET_KEY` in GitHub secrets.

---

## Org-wide meetings list

**Path:** `/org/[slug]/meetings`

Cross-team list of all L10 meetings. Creating a meeting here requires picking a team. Links redirect to the team L10 live view when a team is assigned.

---

## Tips for great L10s

- Start on time; use the timer to keep IDS to 60 minutes.
- Update scorecard and rocks **during** the meeting, not before.
- Use the **parking lot** for issues that are not today's IDS (see [Issues](./issues.md)).
- Rate every meeting 1–10; track the trend on team Overview.
- Send cascading messages in Conclude so other teams get inbox items.
