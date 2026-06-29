import { describe, expect, it } from "vitest";
import {
  AI_RUN_CONTRIBUTOR_ROLES,
  ORG_ROLES,
  TEAM_ROLES,
  isAiRunContributorRole,
  isOrgRole,
  isTeamRole,
  parseOrgRole,
  parseTeamRole,
} from "@/lib/db/roles";

describe("lib/db/roles", () => {
  describe("isOrgRole", () => {
    it("accepts all contract org roles", () => {
      for (const role of ORG_ROLES) {
        expect(isOrgRole(role)).toBe(true);
      }
    });

    it("rejects unknown roles", () => {
      expect(isOrgRole("superadmin")).toBe(false);
      expect(isOrgRole("")).toBe(false);
    });
  });

  describe("isTeamRole", () => {
    it("accepts all contract team roles", () => {
      for (const role of TEAM_ROLES) {
        expect(isTeamRole(role)).toBe(true);
      }
    });

    it("rejects unknown roles", () => {
      expect(isTeamRole("captain")).toBe(false);
    });
  });

  describe("parseOrgRole / parseTeamRole", () => {
    it("returns parsed role or null", () => {
      expect(parseOrgRole("admin")).toBe("admin");
      expect(parseOrgRole("invalid")).toBeNull();
      expect(parseTeamRole("leader")).toBe("leader");
      expect(parseTeamRole("invalid")).toBeNull();
    });
  });

  describe("isAiRunContributorRole", () => {
    it("allows owner, admin, member", () => {
      for (const role of AI_RUN_CONTRIBUTOR_ROLES) {
        expect(isAiRunContributorRole(role)).toBe(true);
      }
    });

    it("denies viewer", () => {
      expect(isAiRunContributorRole("viewer")).toBe(false);
    });
  });
});
