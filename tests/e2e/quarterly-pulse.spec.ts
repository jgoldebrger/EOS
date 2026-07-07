import { expect, test } from "@playwright/test";

test.describe("quarterly pulse (no Supabase)", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/company/quarterly");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("quarterly pulse (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("quarterly pulse workspace renders checklist", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/company/quarterly`);

    await expect(page.getByRole("heading", { name: "Quarterly pulse" })).toBeVisible();
    await expect(page.getByTestId("quarterly-pulse-workspace")).toBeVisible();
    await expect(page.getByText(/Review V\/TO/i)).toBeVisible();
    await expect(page.getByText(/People Analyzer/i)).toBeVisible();
  });
});
