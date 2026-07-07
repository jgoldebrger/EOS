import { expect, test } from "@playwright/test";

test.describe("mobile L10 facilitator (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("live meeting shows mobile agenda strip and facilitator bar", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const meetingId = process.env.E2E_MEETING_ID ?? "55555555-5555-5555-5555-555555555555";

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/org/${orgSlug}/meetings/${meetingId}`);

    const shell = page.getByTestId("live-meeting-shell");
    const scheduled = page.getByTestId("meeting-scheduled-view");
    const completed = page.getByTestId("meeting-completed-view");

    if (await shell.isVisible()) {
      await expect(page.getByTestId("l10-mobile-agenda-strip")).toBeVisible();
      await expect(page.getByTestId("l10-mobile-facilitator-bar")).toBeVisible();
      return;
    }

    await expect(scheduled.or(completed)).toBeVisible();
  });
});
