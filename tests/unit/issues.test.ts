import { describe, expect, it } from "vitest";
import {
  archiveIssueSchema,
  createIssueSchema,
  prioritizeIssueSchema,
  solveIssueSchema,
  updateIssueSchema,
} from "@/features/issues/schema";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const issueId = "550e8400-e29b-41d4-a716-446655440003";
const ownerId = "550e8400-e29b-41d4-a716-446655440002";

describe("createIssueSchema", () => {
  it("requires title", () => {
    const result = createIssueSchema.safeParse({
      organizationId: orgId,
      title: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid issue input", () => {
    const result = createIssueSchema.safeParse({
      organizationId: orgId,
      title: "Hiring bottleneck",
      ownerId,
      priority: 5,
      status: "open",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = createIssueSchema.safeParse({
      organizationId: orgId,
      title: "Hiring bottleneck",
      status: "pending",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateIssueSchema", () => {
  it("allows partial updates", () => {
    const result = updateIssueSchema.safeParse({
      organizationId: orgId,
      issueId,
      status: "discussing",
      idsNotes: "Root cause identified in onboarding funnel.",
    });

    expect(result.success).toBe(true);
  });
});

describe("solveIssueSchema", () => {
  it("requires issue id", () => {
    const result = solveIssueSchema.safeParse({
      organizationId: orgId,
    });

    expect(result.success).toBe(false);
  });

  it("accepts solve with optional ids notes", () => {
    const result = solveIssueSchema.safeParse({
      organizationId: orgId,
      issueId,
      idsNotes: "Hired two recruiters; pipeline normalized.",
    });

    expect(result.success).toBe(true);
  });
});

describe("archiveIssueSchema", () => {
  it("requires organization and issue ids", () => {
    const result = archiveIssueSchema.safeParse({
      organizationId: orgId,
      issueId,
    });

    expect(result.success).toBe(true);
  });
});

describe("prioritizeIssueSchema", () => {
  it("requires non-negative priority", () => {
    const result = prioritizeIssueSchema.safeParse({
      organizationId: orgId,
      issueId,
      priority: -1,
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid priority", () => {
    const result = prioritizeIssueSchema.safeParse({
      organizationId: orgId,
      issueId,
      priority: 10,
    });

    expect(result.success).toBe(true);
  });
});
