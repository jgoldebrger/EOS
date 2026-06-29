import { describe, expect, it } from "vitest";
import {
  canEditResource,
  canManageOrg,
  canManageTeam,
  canViewResource,
} from "@/lib/permissions/checks";

describe("permission checks", () => {
  describe("canManageOrg", () => {
    it("allows owner and admin", () => {
      expect(canManageOrg("owner")).toBe(true);
      expect(canManageOrg("admin")).toBe(true);
    });

    it("denies member and viewer", () => {
      expect(canManageOrg("member")).toBe(false);
      expect(canManageOrg("viewer")).toBe(false);
    });
  });

  describe("canManageTeam", () => {
    it("allows org admins regardless of team role", () => {
      expect(canManageTeam("owner", "viewer")).toBe(true);
      expect(canManageTeam("admin", "member")).toBe(true);
    });

    it("allows team leaders who are not org admins", () => {
      expect(canManageTeam("member", "leader")).toBe(true);
    });

    it("denies non-leader members", () => {
      expect(canManageTeam("member", "member")).toBe(false);
      expect(canManageTeam("viewer", "member")).toBe(false);
    });

    it("allows team leaders even with viewer org role", () => {
      expect(canManageTeam("viewer", "leader")).toBe(true);
    });
  });

  describe("canViewResource", () => {
    it("allows all org roles to view", () => {
      for (const role of ["owner", "admin", "member", "viewer"] as const) {
        expect(canViewResource(role, "rocks")).toBe(true);
      }
    });
  });

  describe("canEditResource", () => {
    it("allows owner, admin, and member", () => {
      expect(canEditResource("owner", "issues")).toBe(true);
      expect(canEditResource("admin", "issues")).toBe(true);
      expect(canEditResource("member", "issues")).toBe(true);
    });

    it("denies viewer", () => {
      expect(canEditResource("viewer", "issues")).toBe(false);
    });
  });
});
