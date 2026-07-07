import { describe, expect, it } from "vitest";
import {
  acceptInvitationByTokenSchema,
  inviteOrgMemberSchema,
} from "@/features/people/schema";

describe("invite schemas", () => {
  it("validates invite org member input", () => {
    const parsed = inviteOrgMemberSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      orgSlug: "demo",
      email: "Person@Company.COM",
      orgRole: "member",
      sendEmail: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("person@company.com");
    }
  });

  it("rejects invalid invite email", () => {
    const parsed = inviteOrgMemberSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      orgSlug: "demo",
      email: "not-an-email",
      orgRole: "member",
    });

    expect(parsed.success).toBe(false);
  });

  it("validates invitation token accept input", () => {
    const parsed = acceptInvitationByTokenSchema.safeParse({
      token: "abc-123",
    });

    expect(parsed.success).toBe(true);
  });
});
