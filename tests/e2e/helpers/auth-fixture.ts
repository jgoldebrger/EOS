import type { Page } from "@playwright/test";
import { signInAsAdmin } from "./auth";

/** Ensure admin session before each @auth test (refreshes API cookie if storage state is stale). */
export async function ensureAdminSession(page: Page): Promise<void> {
  await signInAsAdmin(page);
}
