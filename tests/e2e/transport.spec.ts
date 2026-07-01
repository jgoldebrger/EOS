import { test, expect } from "@playwright/test";

test.describe("Transport", () => {
  test("transport page loads for authenticated org member", async ({ page }) => {
    await page.goto("/org/demo/transport");
    await expect(page.getByRole("heading", { name: "Transport" })).toBeVisible({
      timeout: 15000,
    });
  });
});
