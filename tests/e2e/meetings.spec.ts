import { expect, test } from "@playwright/test";
import { ensureAdminSession } from "./helpers/auth-fixture";
import { pageHeading } from "./helpers/locators";

/**
 * Meetings page structure tests.
 * Full viewer/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("meetings page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org meetings", async ({
    page,
  }) => {
    await page.goto("/org/demo/meetings");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("meetings page (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("meetings list page renders structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/meetings`);

    await expect(pageHeading(page, "Meetings")).toBeVisible();
    await expect(page.getByTestId("meetings-list")).toBeVisible();
    await expect(page.getByTestId("create-l10-meeting-button")).toBeVisible();
  });

  test("create L10 meeting dialog opens", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/meetings`);

    await page.getByTestId("create-l10-meeting-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-meeting-submit")).toBeVisible();
  });

  test("live meeting shows agenda panel", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";
    const meetingId = process.env.E2E_MEETING_ID ?? "55555555-5555-5555-5555-555555555555";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10/${meetingId}`);

    await expect(page.getByTestId("live-meeting-shell")).toBeVisible();
    await expect(page.getByTestId("meeting-agenda-panel")).toBeVisible();
    await expect(page.getByTestId("agenda-section-issues")).toBeVisible();
  });

  test("team L10 hub renders", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10`);

    await expect(page.getByTestId("l10-hub")).toBeVisible();
    await expect(page.getByTestId("create-l10-meeting-button")).toBeVisible();
  });

  test("scorecard section embeds inline grid in live L10", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";
    const meetingId = process.env.E2E_MEETING_ID ?? "55555555-5555-5555-5555-555555555555";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10/${meetingId}`);

    await expect(page.getByTestId("l10-section-scorecard")).toBeVisible();
    await expect(page.getByTestId("section-embed-scorecard")).toHaveCount(0);
    await expect(
      page.getByTestId("scorecard-metric-table").or(page.getByTestId("scorecard-empty-state")),
    ).toBeVisible();
  });
});
