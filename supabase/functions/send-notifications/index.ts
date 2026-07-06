import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildNotificationHtml } from "./templates.ts";

interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string;
  type?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function verifySecret(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  const expected =
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!auth || !expected) {
    return false;
  }

  return auth === `Bearer ${expected}`;
}

async function sendViaResend(payload: NotificationPayload): Promise<{ sent: boolean; messageId?: string }> {
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

    let payload: NotificationPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    if (!payload.to || !payload.subject || !payload.body) {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    const { sent, messageId } = await sendViaResend(payload);

    if (!sent) {
      console.info("[send-notifications] log only", payload);
    }

    return jsonResponse({ success: true, sent, messageId });
  },
};

export default handler;
