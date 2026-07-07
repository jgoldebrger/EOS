import { expect, test } from "@playwright/test";

test.describe("invite flow (no Supabase)", () => {
  test("unauthenticated users are redirected from invite accept page", async ({ page }) => {
    await page.goto("/auth/invite?token=test-token");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("members settings redirects unauthenticated users", async ({ page }) => {
    await page.goto("/org/demo/settings/members");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("invite flow (@auth)", () => {
  test.skip(!process.env.E2E_SUPABASE_ENABLED, "Requires E2E_SUPABASE_ENABLED");

  test("admin can open members settings with invite controls", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/settings/members`);

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByTestId("members-management")).toBeVisible();
    await expect(page.getByRole("button", { name: /invite person/i })).toBeVisible();
  });
});
