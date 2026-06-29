import { expect, test } from "@playwright/test";

/**
 * Accountability chart page structure tests.
 * Full admin/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("accountability page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org accountability", async ({
    page,
  }) => {
    await page.goto("/org/demo/accountability");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("accountability page (authenticated)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test("accountability page renders chart structure", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/accountability`);

    await expect(
      page.getByRole("heading", { name: "Accountability Chart" }),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("accountability-chart")
        .or(page.getByRole("status")),
    ).toBeVisible();
  });

  test("viewer cannot see add seat control", async ({ page }) => {
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/accountability`);

    await expect(page.getByTestId("add-seat-button")).toHaveCount(0);
  });

  test("admin can open seat creation dialog", async ({ page }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/accountability`);

    await page.getByTestId("add-seat-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-seat-submit")).toBeVisible();
  });
});
