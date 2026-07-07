import { expect, type Page } from "@playwright/test";

export const E2E_TEAM_SLUG = process.env.E2E_TEAM_SLUG ?? "leadership";

/** Page title h1 — avoids strict-mode clashes with empty-state h3 headings. */
export function pageHeading(page: Page, name: string) {
  return page.getByRole("heading", { name, exact: true, level: 1 });
}

export function teamScorecardPath(
  orgSlug: string,
  teamSlug = E2E_TEAM_SLUG,
): string {
  return `/org/${orgSlug}/teams/${teamSlug}/scorecard`;
}

/** Switch an in-progress L10 meeting to a section and wait for server refresh. */
export async function activateL10Section(
  page: Page,
  sectionKey: string,
): Promise<void> {
  const section = page.getByTestId(`agenda-section-${sectionKey}`);
  if ((await section.getAttribute("data-active")) !== "true") {
    await section.click();
  }
  await expect(section).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId(`l10-section-${sectionKey}`)).toBeVisible();
}
