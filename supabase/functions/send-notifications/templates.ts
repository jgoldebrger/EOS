export type EmailTemplateType =
  | "assignment"
  | "l10_recap"
  | "cascade"
  | "people_review_reminder"
  | "smoke_test"
  | "l10_reminder"
  | "scorecard_digest";

interface TemplateInput {
  subject: string;
  body: string;
  actionUrl?: string;
  type?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatBodyParagraphs(body: string): string {
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function templateLabel(type: EmailTemplateType | undefined): string {
  switch (type) {
    case "l10_recap":
      return "L10 Recap";
    case "cascade":
      return "Cascade Message";
    case "people_review_reminder":
      return "People Review";
    case "l10_reminder":
      return "L10 Reminder";
    case "scorecard_digest":
      return "Scorecard Digest";
    case "assignment":
    default:
      return "Assignment";
  }
}

export function buildNotificationHtml(input: TemplateInput): string {
  const type = (input.type ?? "assignment") as EmailTemplateType;
  const label = templateLabel(type);
  const title = escapeHtml(input.subject);
  const paragraphs = formatBodyParagraphs(input.body);
  const actionUrl = input.actionUrl ? escapeHtml(input.actionUrl) : null;
  const ctaLabel = type === "l10_recap"
    ? "View recap"
    : type === "l10_reminder"
      ? "Open L10"
      : type === "cascade"
        ? "Read cascade"
        : type === "scorecard_digest"
          ? "Open scorecard"
          : "Open in EOS";

  const button = actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
        <tr>
          <td style="border-radius:8px;background:#0f172a;">
            <a href="${actionUrl}" style="display:inline-block;padding:12px 20px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${ctaLabel}</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">Or copy this link: <a href="${actionUrl}" style="color:#2563eb;">${actionUrl}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0f172a;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">EOS</div>
                <div style="margin-top:8px;font-size:20px;font-weight:600;line-height:1.3;">${title}</div>
                <div style="margin-top:6px;font-size:13px;opacity:0.85;">${escapeHtml(label)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${paragraphs}
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;line-height:1.5;">
                You are receiving this because notifications are enabled for your EOS workspace.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
