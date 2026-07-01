import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "https://esm.sh/zod@3.24.2";
import {
  jsonResponse,
  requireUserId,
  verifyOrgAccess,
} from "../_shared/edge-utils.ts";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  jobs: z.array(
    z.object({
      id: z.number().int(),
      location: z.tuple([z.number(), z.number()]),
      service: z.number().int().optional(),
    }),
  ),
  vehicles: z.array(
    z.object({
      id: z.number().int(),
      start: z.tuple([z.number(), z.number()]),
      end: z.tuple([z.number(), z.number()]).optional(),
    }),
  ),
});

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed", success: false }, 405);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_json", success: false }, 400);
    }

    const parsed = inputSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_input", success: false }, 400);
    }

    const userId = requireUserId(ctx);
    if (!userId) {
      return jsonResponse({ error: "unauthorized", success: false }, 401);
    }

    const allowed = await verifyOrgAccess(
      ctx.supabase,
      parsed.data.organizationId,
      userId,
    );
    if (!allowed) {
      return jsonResponse({ error: "forbidden", success: false }, 403);
    }

    const vroomUrl = Deno.env.get("VROOM_URL") ?? "http://localhost:3001";

    try {
      const response = await fetch(`${vroomUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: parsed.data.jobs,
          vehicles: parsed.data.vehicles,
          options: { g: true },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return jsonResponse(
          { success: false, error: "vroom_error", detail: text },
          502,
        );
      }

      const solution = await response.json();
      return jsonResponse({ success: true, solution });
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: "vroom_unreachable",
          detail: error instanceof Error ? error.message : "unknown",
        },
        502,
      );
    }
  }),
};
