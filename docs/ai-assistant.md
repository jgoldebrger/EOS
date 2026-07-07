# AI Assistant

EOS includes AI-powered suggestions that help with meetings, scorecards, and issues. All AI output requires **your approval** before anything is applied.

## How approval works

1. You trigger an AI action (for example **Summarize meeting**).
2. The AI returns suggestions in an **approval panel**.
3. Review each suggestion — **Approve** or **Reject**.
4. Approved items are applied; rejected items are discarded.

AI runs are logged for accountability.

---

## Available AI features

| Feature | Where | What it does |
|---------|-------|--------------|
| **Meeting summary** | Live L10 / recap | Generates summary from section notes |
| **Extract to-dos** | Live L10 notes | Suggests to-dos from meeting notes |
| **Scorecard analysis** | Team scorecard | Insights on metric trends and gaps |
| **Issue dedupe** | Team issues | Finds duplicate issues to merge |

---

## Meeting summary

During or after an L10:

1. Open the AI summary panel.
2. Click **Generate summary**.
3. Review the proposed summary text.
4. Approve to save or share.

---

## Extract to-dos

From meeting notes:

1. Click **Extract to-dos**.
2. Review each suggested task (title, owner hints).
3. Approve to create real to-dos.

---

## Scorecard analysis

On the team scorecard:

1. Click **Analyze**.
2. Review metric-level suggestions.
3. Approve actionable recommendations.

---

## Issue deduplication

On the issues workspace:

1. Click **Find duplicates**.
2. Review merge suggestions (pairs or groups of similar issues).
3. Approve to merge into one issue.

---

## Requirements

AI features require `OPENAI_API_KEY` configured on Supabase Edge Functions. If AI is unavailable, buttons show a configuration message.

---

## Best practices

- Always read suggestions — AI can misinterpret context.
- Use summaries as drafts, not final board communications.
- Dedupe issues before IDS to shorten the list.
