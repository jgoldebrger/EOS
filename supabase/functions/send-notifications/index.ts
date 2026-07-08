import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "https://esm.sh/zod@3.24.2";
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

function verifySecret(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  const scopedSecret = Deno.env.get("NOTIFICATIONS_CRON_SECRET");
  const fallbackSecret =
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const expected = scopedSecret ?? fallbackSecret;

  if (!auth || !expected) {
    return false;
  }

  return auth === `Bearer ${expected}`;
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
  async fetch(req: Request): Promise<Response> {
    if (!verifySecret(req)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

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
  },
};

export default handler;
