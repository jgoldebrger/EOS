import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();
const mockCreateClient = vi.fn(async () => ({
  from: mockFrom,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

const mockGetOrgPeople = vi.fn();
vi.mock("@/features/people/queries", () => ({
  getOrgPeopleWithManagers: (...args: unknown[]) => mockGetOrgPeople(...args),
}));

import { searchNavigationEntities } from "@/lib/search/nav-search";

function chain(result: { data: unknown; error?: null }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(async () => result),
  };
  return builder;
}

describe("searchNavigationEntities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgPeople.mockResolvedValue([
      {
        userId: "user-1",
        displayName: "Alex Manager",
        orgRole: "admin",
        reportsToUserId: null,
        managerName: null,
        seatTitle: "Integrator",
      },
    ]);
  });

  it("returns empty results for short queries", async () => {
    const result = await searchNavigationEntities("org-1", "acme", "a");
    expect(result).toEqual({
      rocks: [],
      issues: [],
      meetings: [],
      people: [],
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("maps rocks, issues, meetings, and people hits", async () => {
    mockFrom
      .mockReturnValueOnce(
        chain({
          data: [{ id: "rock-1", title: "Grow revenue", teams: { slug: "leadership" } }],
        }),
      )
      .mockReturnValueOnce(
        chain({
          data: [{ id: "issue-1", title: "Hiring gap", teams: { slug: "leadership" } }],
        }),
      )
      .mockReturnValueOnce(
        chain({
          data: [{ id: "meet-1", title: "Weekly L10", teams: { slug: "leadership" } }],
        }),
      );

    const result = await searchNavigationEntities("org-1", "acme", "alex");

    expect(result.rocks).toEqual([
      {
        id: "rock-1",
        title: "Grow revenue",
        href: "/org/acme/teams/leadership/rocks",
      },
    ]);
    expect(result.issues[0]?.href).toBe("/org/acme/teams/leadership/issues");
    expect(result.meetings[0]?.href).toBe("/org/acme/teams/leadership/l10/meet-1");
    expect(result.people[0]?.displayName).toBe("Alex Manager");
    expect(result.people[0]?.href).toBe("/org/acme/people");
  });
});
