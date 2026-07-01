import { test, expect } from "@playwright/test";

test.describe("Projects", () => {
  test("projects page loads for authenticated org member", async ({ page }) => {
    await page.goto("/org/demo/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible({
      timeout: 15000,
    });
  });
});
