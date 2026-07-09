import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "npm:zod";
import { buildNotificationHtml } from "./templates.ts";

const notificationPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
  actionUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "actionUrl must be a relative or absolute URL",
    })
    .optional(),
  type: z
    .enum([
      "assignment",
      "l10_recap",
      "l10_reminder",
      "cascade",
      "people_review_reminder",
      "scorecard_digest",
    ])
    .optional(),
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

async function sendViaResend(
  payload: z.infer<typeof notificationPayloadSchema>,
): Promise<{ sent: boolean; messageId?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "notifications@localhost";

  if (!apiKey) {
    return { sent: false };
  }

  const htmlBody = buildNotificationHtml(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[send-notifications] Resend error", response.status, detail);
    return { sent: false };
  }

  const result = await response.json().catch(() => ({}));
  const messageId = typeof result.id === "string" ? result.id : undefined;
  return { sent: true, messageId };
}

const handler = {
  fetch: withSupabase({ auth: "secret" }, async (req) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    const parsed = notificationPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    const payload = parsed.data;
    const { sent, messageId } = await sendViaResend(payload);

    if (!sent) {
      console.info("[send-notifications] log only", payload);
    }

    return jsonResponse({ success: true, sent, messageId });
  }),
};

export default handler;
