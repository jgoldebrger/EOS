import { test, expect } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

test.describe("Projects", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and seeded org data",
  );

  test("projects page loads for authenticated org member", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/projects`);
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });
});
