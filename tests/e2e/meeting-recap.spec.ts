import { expect, test } from "@playwright/test";
import { ensureAdminSession } from "./helpers/auth-fixture";

test.describe("meeting recap", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/teams/leadership/l10/55555555-5555-5555-5555-555555555555/recap");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("meeting recap (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("recap view renders with copy link", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    const teamSlug = process.env.E2E_TEAM_SLUG ?? "leadership";
    const meetingId = process.env.E2E_MEETING_ID ?? "55555555-5555-5555-5555-555555555555";

    await page.goto(`/org/${orgSlug}/teams/${teamSlug}/l10/${meetingId}/recap`);
    await expect(page.getByTestId("meeting-recap-view")).toBeVisible();
    await expect(page.getByTestId("copy-recap-link")).toBeVisible();
  });
});
