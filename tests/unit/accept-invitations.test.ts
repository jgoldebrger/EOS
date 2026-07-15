import { describe, expect, it, vi, beforeEach } from "vitest";

const from = vi.fn();
const eq = vi.fn();
const insert = vi.fn();
const updateEq = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => from(...args),
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(async () => undefined),
}));

describe("acceptPendingInvitations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    maybeSingle.mockResolvedValue({ data: null });
    insert.mockResolvedValue({ error: null });
    updateEq.mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === "invitations") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              eq(column, value);
              return {
                eq: (column2: string, value2: unknown) => {
                  eq(column2, value2);
                  return {
                    is: () => ({
                      gt: async () => ({
                        data: [
                          {
                            id: "inv-1",
                            organization_id: "org-1",
                            email: "user@example.com",
                            org_role: "member",
                            invited_by: "admin-1",
                            organizations: { slug: "acme" },
                          },
                        ],
                        error: null,
                      }),
                    }),
                  };
                },
              };
            },
          }),
          update: () => ({
            eq: (...args: unknown[]) => updateEq(...args),
          }),
        };
      }

      if (table === "organization_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle,
              }),
            }),
          }),
          insert: (...args: unknown[]) => insert(...args),
        };
      }

      return {};
    });
  });

  it("rejects empty tokens without querying invitations", async () => {
    const { acceptPendingInvitations } = await import("@/lib/people/accept-invitations");
    const result = await acceptPendingInvitations({
      userId: "user-1",
      email: "user@example.com",
      token: "   ",
    });

    expect(result.accepted).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("accepts only the invitation matching the token", async () => {
    const { acceptPendingInvitations } = await import("@/lib/people/accept-invitations");
    const result = await acceptPendingInvitations({
      userId: "user-1",
      email: "user@example.com",
      token: "invite-token-1",
    });

    expect(eq).toHaveBeenCalledWith("token", "invite-token-1");
    expect(result.accepted).toEqual([
      {
        organizationId: "org-1",
        orgSlug: "acme",
        orgRole: "member",
      },
    ]);
  });
});
