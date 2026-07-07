import { expect, test } from "@playwright/test";
import { signInAsViewer } from "./helpers/auth";

/**
 * Rocks page structure tests.
 * Full viewer/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("rocks page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org rocks", async ({ page }) => {
    await page.goto("/org/demo/rocks");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("rocks page (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test("rocks page renders table structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/rocks`);

    await expect(page.getByRole("heading", { name: "Rocks" })).toBeVisible();
    await expect(
      page.getByTestId("rocks-table").or(page.getByRole("status")),
    ).toBeVisible();
    await expect(page.getByTestId("rocks-filters")).toBeVisible();
  });

  test("viewer cannot see add rock control", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/rocks`);

    await expect(page.getByTestId("add-rock-button")).toHaveCount(0);
    await expect(page.getByTestId("rock-status-select")).toHaveCount(0);
  });

  test("admin can open rock creation dialog", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/rocks`);

    await page.getByTestId("add-rock-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-rock-submit")).toBeVisible();
  });
});
