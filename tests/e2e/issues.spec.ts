import { expect, test } from "@playwright/test";
import { signInAsViewer } from "./helpers/auth";
import { ensureAdminSession } from "./helpers/auth-fixture";

/**
 * Issues page structure tests.
 * Full viewer/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("issues page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org issues", async ({ page }) => {
    await page.goto("/org/demo/issues");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("issues page (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("issues page renders table structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/issues`);

    await expect(page.getByRole("heading", { name: "Issues" })).toBeVisible();
    await expect(
      page.getByTestId("issues-table").or(page.getByRole("status")),
    ).toBeVisible();
    await expect(page.getByTestId("issues-filters")).toBeVisible();
  });

  test("viewer cannot see add issue control", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/issues`);

    await expect(page.getByTestId("add-issue-button")).toHaveCount(0);
    await expect(page.getByTestId("issue-priority-controls")).toHaveCount(0);
  });

  test("admin can open issue creation dialog", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/issues`);

    await page.getByTestId("add-issue-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-issue-submit")).toBeVisible();
  });
});
