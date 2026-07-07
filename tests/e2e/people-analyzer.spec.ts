import { expect, test } from "@playwright/test";
import { ensureAdminSession } from "./helpers/auth-fixture";

test.describe("people analyzer", () => {
  test("unauthenticated users are redirected", async ({ page }) => {
    await page.goto("/org/demo/people/analyzer");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("people analyzer (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("analyzer page renders", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/people/analyzer`);
    await expect(page.getByTestId("people-analyzer")).toBeVisible();
  });
});
