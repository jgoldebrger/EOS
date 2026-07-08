import type { Page } from "@playwright/test";
import { injectSupabaseSession } from "./supabase-session";

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@demo.local";
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eTestPassword1!";
export const E2E_VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL ?? "viewer@demo.local";
export const E2E_VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD ?? "E2eTestPassword1!";
export const E2E_ORG_SLUG = process.env.E2E_ORG_SLUG ?? "demo";
export const E2E_VIEWER_ORG_SLUG = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";

const NAV_TIMEOUT = process.env.CI ? 60_000 : 30_000;

function orgUrlPattern(orgSlug: string): RegExp {
  return new RegExp(`/org/${orgSlug}`);
}

async function waitForAuthForm(page: Page): Promise<void> {
  await page.getByText(/welcome back/i).waitFor({ timeout: NAV_TIMEOUT });
  await page.getByRole("textbox", { name: "Email", exact: true }).waitFor({
    timeout: NAV_TIMEOUT,
  });
}

async function submitSignIn(
  page: Page,
  email: string,
  password: string,
  orgSlug: string,
): Promise<void> {
  const next = `/org/${orgSlug}/dashboard`;
  await page.goto(`/auth?next=${encodeURIComponent(next)}`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });

  if (orgUrlPattern(orgSlug).test(page.url())) {
    const heading = page.getByRole("heading", { level: 1 });
    if (await heading.isVisible().catch(() => false)) {
      return;
    }
  }

  await waitForAuthForm(page);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

export async function waitForOrgLanding(page: Page, orgSlug = E2E_ORG_SLUG): Promise<void> {
  await page.waitForURL(orgUrlPattern(orgSlug), {
    timeout: NAV_TIMEOUT,
    waitUntil: "domcontentloaded",
  });
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await submitSignIn(page, email, password, E2E_ORG_SLUG);
  await waitForOrgLanding(page);
}

async function ensureOrgSession(
  page: Page,
  orgSlug: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(`/org/${orgSlug}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });

  if (orgUrlPattern(orgSlug).test(page.url())) {
    const heading = page.getByRole("heading", { level: 1 });
    if (await heading.isVisible().catch(() => false)) {
      return;
    }
  }

  await injectSupabaseSession(page.context(), email, password);

  await page.goto(`/org/${orgSlug}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
  await waitForOrgLanding(page, orgSlug);
}

export async function signInAsAdmin(page: Page): Promise<void> {
  await page.goto(`/org/${E2E_ORG_SLUG}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
  if (orgUrlPattern(E2E_ORG_SLUG).test(page.url())) {
    const heading = page.getByRole("heading", { level: 1 });
    if (await heading.isVisible().catch(() => false)) {
      return;
    }
  }
  await ensureOrgSession(page, E2E_ORG_SLUG, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
}

export async function signInAsViewer(page: Page): Promise<void> {
  await injectSupabaseSession(page.context(), E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD);
  await page.goto(`/org/${E2E_VIEWER_ORG_SLUG}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
  await waitForOrgLanding(page, E2E_VIEWER_ORG_SLUG);
}
