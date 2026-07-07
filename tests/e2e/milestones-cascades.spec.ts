import { expect, test } from "@playwright/test";

test.describe("rock milestones (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("L10 rocks section exposes milestones in meeting mode", async ({ page }) => {
    const meetingId = process.env.E2E_MEETING_ID;
    test.skip(!meetingId, "Requires E2E_MEETING_ID for live L10 meeting");

    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10/${meetingId}`);

    const rocksSection = page.getByTestId("l10-section-rocks");
    await expect(rocksSection).toBeVisible({ timeout: 15_000 });
    await expect(
      rocksSection
        .getByTestId("rock-milestones-panel")
        .or(rocksSection.getByTestId("rocks-table")),
    ).toBeVisible();
  });
});

test.describe("L10 IDS meeting list (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("issues section uses drag-and-drop meeting list with parking lot", async ({ page }) => {
    const meetingId = process.env.E2E_MEETING_ID;
    test.skip(!meetingId, "Requires E2E_MEETING_ID for live L10 meeting");

    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10/${meetingId}`);

    const issuesSection = page.getByTestId("l10-section-issues");
    await expect(issuesSection).toBeVisible({ timeout: 15_000 });
    await expect(issuesSection.getByTestId("issues-meeting-list")).toBeVisible();
    await expect(issuesSection.getByTestId("issues-parking-lot")).toBeVisible();
    await expect(issuesSection.getByTestId("ids-top3-timer")).toBeVisible();
  });
});

test.describe("cascade inbox (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("inbox supports cascade filter", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/inbox`);

    const filter = page.getByLabel("Filter by type");
    await expect(filter).toBeVisible();
    await filter.selectOption("cascade");
  });
});
