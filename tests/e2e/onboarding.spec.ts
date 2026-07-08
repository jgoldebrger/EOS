import { expect, test } from "@playwright/test";

/**
 * Onboarding requires Supabase auth + database in CI.
 * These tests verify page structure without completing the full flow.
 */
test.describe("onboarding page", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test("redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("onboarding structure (no Supabase)", () => {
  test("auth page links exist from homepage", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth",
    );
    await expect(page.getByRole("link", { name: /documentation/i })).toHaveAttribute(
      "href",
      "/docs",
    );
  });
});
