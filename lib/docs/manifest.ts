export interface DocEntry {
  slug: string;
  title: string;
  description: string;
  section: string;
}

export interface DocSection {
  id: string;
  title: string;
  entries: DocEntry[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "foundations",
    title: "Foundations",
    entries: [
      {
        slug: "getting-started",
        title: "Getting Started",
        description: "Sign in, onboarding, and first steps",
        section: "foundations",
      },
      {
        slug: "navigation",
        title: "Navigation",
        description: "Global nav, team workspace, and search",
        section: "foundations",
      },
      {
        slug: "roles-and-permissions",
        title: "Roles & Permissions",
        description: "Who can view, edit, and administer",
        section: "foundations",
      },
      {
        slug: "keyboard-shortcuts",
        title: "Keyboard Shortcuts",
        description: "Quick keys and productivity tips",
        section: "foundations",
      },
    ],
  },
  {
    id: "daily-work",
    title: "Daily work",
    entries: [
      {
        slug: "home-and-inbox",
        title: "Home, Inbox & Activity",
        description: "Dashboard and personal notifications",
        section: "daily-work",
      },
      {
        slug: "teams",
        title: "Teams",
        description: "Team directory and workspaces",
        section: "daily-work",
      },
      {
        slug: "l10-meetings",
        title: "L10 Meetings",
        description: "Run Level 10 meetings end to end",
        section: "daily-work",
      },
      {
        slug: "scorecard",
        title: "Scorecard",
        description: "Metrics, goals, and rollups",
        section: "daily-work",
      },
      {
        slug: "rocks",
        title: "Rocks",
        description: "Quarterly priorities and milestones",
        section: "daily-work",
      },
      {
        slug: "issues",
        title: "Issues",
        description: "IDS, parking lot, and priorities",
        section: "daily-work",
      },
      {
        slug: "todos",
        title: "To-Dos",
        description: "7-day accountable tasks",
        section: "daily-work",
      },
      {
        slug: "headlines-and-cascades",
        title: "Headlines & Cascades",
        description: "Wins and cascading messages",
        section: "daily-work",
      },
    ],
  },
  {
    id: "company",
    title: "Company & people",
    entries: [
      {
        slug: "people",
        title: "People",
        description: "Directory and People Analyzer",
        section: "company",
      },
      {
        slug: "company-vto-accountability",
        title: "Company, V/TO & Accountability",
        description: "Vision, seats, and company rocks",
        section: "company",
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    entries: [
      {
        slug: "process-sop",
        title: "Process & SOPs",
        description: "Process libraries and SOP editor",
        section: "operations",
      },
      {
        slug: "projects",
        title: "Projects",
        description: "Project workspaces and work items",
        section: "operations",
      },
      {
        slug: "transport",
        title: "Transport",
        description: "Dispatch, loads, and routing",
        section: "operations",
      },
      {
        slug: "reports-and-activity",
        title: "Reports",
        description: "Executive views and exports",
        section: "operations",
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    entries: [
      {
        slug: "ai-assistant",
        title: "AI Assistant",
        description: "Summaries, suggestions, and approvals",
        section: "advanced",
      },
      {
        slug: "notifications",
        title: "Notifications",
        description: "Email and in-app delivery",
        section: "advanced",
      },
      {
        slug: "settings-and-security",
        title: "Settings & Security",
        description: "Members, audit, SSO, L10 agenda",
        section: "advanced",
      },
    ],
  },
];

export const DEFAULT_DOC_SLUG = "getting-started";

export function getAllDocSlugs(): string[] {
  return DOC_SECTIONS.flatMap((section) => section.entries.map((entry) => entry.slug));
}

export function getDocEntry(slug: string): DocEntry | undefined {
  for (const section of DOC_SECTIONS) {
    const entry = section.entries.find((item) => item.slug === slug);
    if (entry) {
      return entry;
    }
  }
  return undefined;
}

export function getFlatDocEntries(): DocEntry[] {
  return DOC_SECTIONS.flatMap((section) => section.entries);
}

export function getAdjacentDocs(slug: string): {
  prev: DocEntry | null;
  next: DocEntry | null;
} {
  const flat = getFlatDocEntries();
  const index = flat.findIndex((entry) => entry.slug === slug);
  if (index === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
