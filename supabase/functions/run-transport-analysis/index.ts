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
  analysisId: z.string().uuid(),
  lng: z.number(),
  lat: z.number(),
  minutes: z.array(z.number().int().min(5).max(120)),
});

const handler = {
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

    const workerUrl = Deno.env.get("FERROBUS_WORKER_URL");
    if (!workerUrl) {
      return jsonResponse(
        {
          success: false,
          error: "ferrobus_worker_not_configured",
        },
        503,
      );
    }

    await ctx.supabase
      .from("transport_analyses")
      .update({ status: "running" })
      .eq("id", parsed.data.analysisId)
      .eq("organization_id", parsed.data.organizationId);

    try {
      const response = await fetch(`${workerUrl}/isochrone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lng: parsed.data.lng,
          lat: parsed.data.lat,
          minutes: parsed.data.minutes,
        }),
      });

      if (!response.ok) {
        await ctx.supabase
          .from("transport_analyses")
          .update({
            status: "failed",
            error_message: `Worker returned ${response.status}`,
          })
          .eq("id", parsed.data.analysisId);

        return jsonResponse({ success: false, error: "worker_error" }, 502);
      }

      const result = await response.json();

      await ctx.supabase
        .from("transport_analyses")
        .update({
          status: "completed",
          result,
          error_message: null,
        })
        .eq("id", parsed.data.analysisId);

      return jsonResponse({ success: true, result });
    } catch (error) {
      await ctx.supabase
        .from("transport_analyses")
        .update({
          status: "failed",
          error_message:
            error instanceof Error ? error.message : "Worker unreachable",
        })
        .eq("id", parsed.data.analysisId);

      return jsonResponse({ success: false, error: "worker_unreachable" }, 502);
    }
  }),
};

export default handler;
