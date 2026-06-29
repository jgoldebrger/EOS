import type { Page } from "@playwright/test";

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@demo.local";
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eTestPassword1!";
export const E2E_VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL ?? "viewer@demo.local";
export const E2E_VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD ?? "E2eTestPassword1!";

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 15_000 });
}

export async function signInAsAdmin(page: Page): Promise<void> {
  await signIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
}

export async function signInAsViewer(page: Page): Promise<void> {
  await signIn(page, E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD);
}
