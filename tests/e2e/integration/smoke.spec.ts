import { expect, test } from "@playwright/test";

/**
 * Cross-route smoke tests that run without a live Supabase instance.
 * Verifies public marketing → auth → onboarding entry points.
 */
test.describe("integration smoke (no Supabase)", () => {
  test("home → auth → onboarding link structure", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /run your business/i })).toBeVisible();

    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByText(/welcome back/i)).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /create organization/i }).click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("all org module routes redirect unauthenticated users to auth", async ({
    page,
  }) => {
    const orgRoutes = [
      "/org/demo/dashboard",
      "/org/demo/scorecard",
      "/org/demo/rocks",
      "/org/demo/issues",
      "/org/demo/todos",
      "/org/demo/meetings",
      "/org/demo/accountability",
      "/org/demo/vto",
      "/org/demo/settings/security",
      "/org/demo/settings/security/sso",
    ];

    for (const route of orgRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test("auth callback route is reachable without org middleware redirect", async ({
    page,
  }) => {
    const response = await page.goto("/auth/callback?error=test");
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/auth/);
  });
});
