import { test, expect } from "@playwright/test";

test.describe("Team workspace navigation", () => {
  test("unauthenticated user is redirected from team routes", async ({ page }) => {
    await page.goto("/org/demo/teams/logistics/overview");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("teams list page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/org/demo/teams");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("Global navigation", () => {
  test("home route redirects unauthenticated users", async ({ page }) => {
    await page.goto("/org/demo/home");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("inbox route redirects unauthenticated users", async ({ page }) => {
    await page.goto("/org/demo/inbox");
    await expect(page).toHaveURL(/\/auth/);
  });
});
