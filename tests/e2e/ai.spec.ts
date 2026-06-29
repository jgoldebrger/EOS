import { expect, test } from "@playwright/test";

/**
 * AI suggestion UI structure tests.
 * Full approve flows require E2E_SUPABASE_ENABLED with OpenAI edge functions deployed.
 */
test.describe("ai suggestion UI (no Supabase)", () => {
  test("unauthenticated users are redirected from org meetings", async ({
    page,
  }) => {
    await page.goto("/org/demo/meetings");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("ai suggestion UI (authenticated)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test("meeting page exposes AI summary panel hooks", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const meetingId = process.env.E2E_MEETING_ID;

    test.skip(!meetingId, "Set E2E_MEETING_ID to an in-progress meeting");

    await page.goto(`/org/${orgSlug}/meetings/${meetingId}`);

    await expect(page.getByTestId("ai-summary-panel")).toBeVisible();
    await expect(page.getByTestId("ai-summarize-meeting-button")).toBeVisible();
    await expect(page.getByTestId("ai-extract-todos-button")).toBeVisible();
  });

  test("scorecard page exposes analyze button", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/scorecard`);

    await expect(page.getByTestId("ai-analyze-scorecard-button")).toBeVisible();
  });

  test("approve flow renders suggestion cards when AI returns data", async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_OPENAI_ENABLED,
      "Requires E2E_OPENAI_ENABLED for live AI suggestion generation",
    );

    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const meetingId = process.env.E2E_MEETING_ID;

    test.skip(!meetingId, "Set E2E_MEETING_ID to an in-progress meeting");

    await page.goto(`/org/${orgSlug}/meetings/${meetingId}`);
    await page.getByTestId("ai-summarize-meeting-button").click();

    await expect(page.getByTestId("ai-approval-panel")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId(/ai-suggestion-card-/)).toBeVisible();
    await expect(page.getByTestId(/ai-suggestion-approve-/)).toBeVisible();
  });
});
