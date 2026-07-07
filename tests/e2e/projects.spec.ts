import { test, expect } from "@playwright/test";
import { ensureAdminSession } from "./helpers/auth-fixture";
import { pageHeading } from "./helpers/locators";

test.describe("Projects (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and seeded org data",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("projects page loads for authenticated org member", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/projects`);
    await expect(pageHeading(page, "Projects")).toBeVisible();
  });
});
