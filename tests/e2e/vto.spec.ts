import { expect, test } from "@playwright/test";
import { signInAsViewer } from "./helpers/auth";
import { ensureAdminSession } from "./helpers/auth-fixture";

/**
 * V/TO page structure tests.
 * Full admin/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("vto page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org vto", async ({ page }) => {
    await page.goto("/org/demo/vto");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("vto page (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("vto page renders editor structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/vto`);

    await expect(
      page.getByRole("heading", { name: "Vision / Traction Organizer" }),
    ).toBeVisible();
    await expect(page.getByTestId("vto-editor")).toBeVisible();
  });

  test("viewer cannot see save snapshot control", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/vto`);

    await expect(page.getByTestId("save-vto-snapshot")).toHaveCount(0);
  });

  test("admin can save a snapshot", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/vto`);

    await expect(page.getByTestId("vto-editor")).toBeVisible();
    await expect(page.getByTestId(/vto-accordion-/).first()).toBeVisible();
    await page.getByTestId("save-vto-snapshot").click();
    await expect(page.getByText("Snapshot saved")).toBeVisible();
    await page.getByTestId("vto-tab-history").click();
    await expect(page.getByTestId("vto-snapshot-history")).toBeVisible();
  });
});
