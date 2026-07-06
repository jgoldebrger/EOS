import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";

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

async function sendViaResend(payload: NotificationPayload): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "notifications@localhost";

  if (!apiKey) {
    return false;
  }

  const htmlBody = payload.actionUrl
    ? `<p>${payload.body}</p><p><a href="${payload.actionUrl}">Open in app</a></p>`
    : `<p>${payload.body}</p>`;

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
    return false;
  }

  return true;
}

const handler = {
  fetch: withSupabase({ auth: "secret" }, async (req) => {
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

    const sent = await sendViaResend(payload);

    if (!sent) {
      console.info("[send-notifications] log only", payload);
    }

    return jsonResponse({ success: true, sent });
  }),
};

Deno.serve(handler);
