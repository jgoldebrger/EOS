import { describe, expect, it, vi } from "vitest";
import { logAuditEvent } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/domain";

describe("logAuditEvent", () => {
  it("inserts audit rows with contract fields", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    };

    await logAuditEvent(supabase as never, {
      organizationId: "22222222-2222-2222-2222-222222222222",
      actorId: "11111111-1111-1111-1111-111111111111",
      action: AUDIT_ACTIONS.CREATE,
      entityType: "organizations",
      entityId: "22222222-2222-2222-2222-222222222222",
      metadata: { name: "Demo" },
    });

    expect(supabase.from).toHaveBeenCalledWith("audit_logs");
    expect(insert).toHaveBeenCalledWith({
      organization_id: "22222222-2222-2222-2222-222222222222",
      actor_id: "11111111-1111-1111-1111-111111111111",
      action: "create",
      entity_type: "organizations",
      entity_id: "22222222-2222-2222-2222-222222222222",
      metadata: { name: "Demo" },
    });
  });

  it("logs insert errors without throwing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: "denied" } });
    const supabase = {
      from: vi.fn().mockReturnValue({ insert }),
    };

    await expect(
      logAuditEvent(supabase as never, {
        organizationId: "22222222-2222-2222-2222-222222222222",
        actorId: "11111111-1111-1111-1111-111111111111",
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "teams",
        entityId: "66666666-6666-6666-6666-666666666666",
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
