import { test, expect } from "@playwright/test";
import { ensureAdminSession } from "./helpers/auth-fixture";

test.describe("Global search (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and seeded org data",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("opens with Ctrl+K and shows search dialog", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/home`);

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByLabel("Global search")).toBeVisible();
  });

  test("shows navigation quick links when typing", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/home`);

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await page.getByLabel("Global search").fill("People");

    await expect(page.getByRole("button", { name: "People" })).toBeVisible();
  });
});
