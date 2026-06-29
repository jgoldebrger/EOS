import { expect, test } from "@playwright/test";

test.describe("auth page", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
  });

  test("validates empty email on submit", async ({ page }) => {
    await page.goto("/auth");

    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/enter a valid email/i)).toBeVisible();
  });

  test("toggles to sign-up mode", async ({ page }) => {
    await page.goto("/auth");

    await page.getByRole("button", { name: /create an account/i }).click();

    await expect(page.getByText(/create your account/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("validates short password", async ({ page }) => {
    await page.goto("/auth");

    await page.getByRole("textbox", { name: "Email", exact: true }).fill("user@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });
});
