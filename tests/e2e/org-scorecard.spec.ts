import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("org scorecard page", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/scorecard");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("org scorecard (authenticated)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("org scorecard page renders rollup table", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/scorecard`);

    await expect(page.getByTestId("org-scorecard-page")).toBeVisible();
    await expect(page.getByTestId("org-scorecard-rollup-table")).toBeVisible();
  });
});
