import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("reports page", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/reports");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("reports (authenticated)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("reports page renders executive panels", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/reports`);
    await expect(page.getByTestId("reports-page")).toBeVisible();
    await expect(page.getByText("Team comparison")).toBeVisible();
    await expect(page.getByTestId("reports-scorecard-rollup")).toBeVisible();
    await expect(page.getByTestId("reports-rprs-panel")).toBeVisible();
    await expect(page.getByTestId("reports-l10-trend")).toBeVisible();
    await expect(page.getByTestId("reports-cascade-drilldown")).toBeVisible();
    await expect(page.getByText("Cascade ack rate")).toBeVisible();
    await expect(page.getByText(/IDS solve rate/)).toBeVisible();
  });
});
