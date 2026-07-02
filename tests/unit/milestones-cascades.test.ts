import { describe, expect, it } from "vitest";
import {
  completeRockMilestoneSchema,
  createRockMilestoneSchema,
  deleteRockMilestoneSchema,
} from "@/features/rocks/milestone-schema";
import { sendCascadesSchema, acknowledgeCascadeSchema } from "@/features/cascades/schema";

describe("createRockMilestoneSchema", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440001";
  const rockId = "550e8400-e29b-41d4-a716-446655440002";

  it("requires title", () => {
    const result = createRockMilestoneSchema.safeParse({
      organizationId: orgId,
      rockId,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid milestone", () => {
    const result = createRockMilestoneSchema.safeParse({
      organizationId: orgId,
      rockId,
      title: "Launch beta",
      dueDate: "2026-06-30",
    });
    expect(result.success).toBe(true);
  });
});

describe("completeRockMilestoneSchema", () => {
  it("requires completed flag", () => {
    const result = completeRockMilestoneSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      rockId: "550e8400-e29b-41d4-a716-446655440002",
      milestoneId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteRockMilestoneSchema", () => {
  it("accepts delete payload", () => {
    const result = deleteRockMilestoneSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      rockId: "550e8400-e29b-41d4-a716-446655440002",
      milestoneId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });
});

describe("sendCascadesSchema", () => {
  it("requires at least one target team", () => {
    const result = sendCascadesSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      orgSlug: "acme",
      sourceTeamId: "550e8400-e29b-41d4-a716-446655440002",
      sourceType: "headline",
      sourceLabel: "Customer win",
      targetTeamIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("acknowledgeCascadeSchema", () => {
  it("accepts acknowledge payload", () => {
    const result = acknowledgeCascadeSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      orgSlug: "acme",
      cascadeId: "550e8400-e29b-41d4-a716-446655440003",
    });
    expect(result.success).toBe(true);
  });
});
