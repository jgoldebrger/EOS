import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("inbox page structure", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/inbox");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("inbox (authenticated)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("inbox workspace renders", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/inbox`);
    await expect(page.getByTestId("inbox-workspace")).toBeVisible();
  });
});
