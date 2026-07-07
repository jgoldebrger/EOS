import { expect, test } from "@playwright/test";
import { signInAsViewer } from "./helpers/auth";
import { ensureAdminSession } from "./helpers/auth-fixture";
import { pageHeading, teamScorecardPath } from "./helpers/locators";

/**
 * Scorecard page structure tests.
 * Full viewer/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("scorecard page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org scorecard", async ({ page }) => {
    await page.goto("/org/demo/scorecard");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("scorecard page (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("scorecard page renders table structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(teamScorecardPath(orgSlug));

    await expect(pageHeading(page, "Scorecard")).toBeVisible();
    await expect(page.getByTestId("scorecard-metric-table").or(
      page.getByTestId("scorecard-empty-state"),
    )).toBeVisible();
  });

  test("viewer cannot see add metric control", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/scorecard`);

    await expect(page.getByTestId("add-metric-button")).toHaveCount(0);
    await expect(page.getByTestId("scorecard-cell-editable")).toHaveCount(0);
  });

  test("admin can open metric creation dialog", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(teamScorecardPath(orgSlug));

    await page.getByTestId("add-metric-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-metric-submit")).toBeVisible();
  });
});
