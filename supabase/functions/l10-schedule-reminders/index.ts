import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "npm:@supabase/server/core";

interface ScheduleRow {
  id: string;
  organization_id: string;
  team_id: string;
  day_of_week: number;
  time_local: string;
  timezone: string;
  reminder_hours_before: number;
  enabled: boolean;
  last_reminder_at: string | null;
  teams: { slug: string; name: string } | null;
  organizations: { slug: string } | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function getNextOccurrenceUtc(schedule: ScheduleRow, fromDate: Date): Date {
  const [hours, minutes] = schedule.time_local.split(":").map((part) => Number.parseInt(part, 10));
  for (let offsetDays = 0; offsetDays < 14; offsetDays += 1) {
    const candidate = new Date(fromDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(candidate);
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    const weekdayIndex = DAY_LABELS.indexOf(weekday);
    if (weekdayIndex !== schedule.day_of_week) {
      continue;
    }
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const localIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    const probe = new Date(`${localIso}Z`);
    if (probe.getTime() > fromDate.getTime()) {
      return probe;
    }
  }
  return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function shouldSendReminder(schedule: ScheduleRow, now: Date): { due: boolean; nextOccurrence: Date } {
  const nextOccurrence = getNextOccurrenceUtc(schedule, now);
  const reminderAt = new Date(
    nextOccurrence.getTime() - schedule.reminder_hours_before * 60 * 60 * 1000,
  );
  if (now.getTime() < reminderAt.getTime()) {
    return { due: false, nextOccurrence };
  }
  if (schedule.last_reminder_at) {
    const last = new Date(schedule.last_reminder_at);
    if (last.getTime() >= reminderAt.getTime()) {
      return { due: false, nextOccurrence };
    }
  }
  return { due: true, nextOccurrence };
}

async function sendNotification(payload: {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string;
  type?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    return false;
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    return false;
  }
  const result = await response.json().catch(() => ({}));
  return result.sent === true;
}

const handler = {
  async fetch(req: Request): Promise<Response> {
    if (!verifySecret(req)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const admin = createAdminClient();
    const now = new Date();
    const { data, error } = await admin
      .from("meeting_schedules")
      .select("*, teams(slug, name), organizations(slug)")
      .eq("enabled", true);

    if (error) {
      return jsonResponse({ error: "load_failed", detail: error.message }, 500);
    }

    let reminded = 0;

    for (const row of (data ?? []) as ScheduleRow[]) {
      const { due, nextOccurrence } = shouldSendReminder(row, now);
      if (!due || !row.teams || !row.organizations) {
        continue;
      }

      const { data: members } = await admin
        .from("team_members")
        .select("user_id")
        .eq("team_id", row.team_id);

      const memberIds = (members ?? []).map((member) => member.user_id);
      if (memberIds.length === 0) {
        continue;
      }

      const l10Url = `/org/${row.organizations.slug}/teams/${row.teams.slug}/l10`;
      const whenLabel = nextOccurrence.toLocaleString("en-US", {
        timeZone: row.timezone,
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      for (const userId of memberIds) {
        await admin.from("inbox_items").insert({
          organization_id: row.organization_id,
          assignee_id: userId,
          title: `L10 reminder: ${row.teams.name}`,
          body: `Your recurring L10 is scheduled for ${whenLabel}.`,
          source_type: "l10_schedule",
          source_id: row.id,
          action_url: l10Url,
        });

        const { data: userData } = await admin.auth.admin.getUserById(userId);
        const email = userData.user?.email;
        if (email) {
          await sendNotification({
            to: email,
            subject: `L10 reminder: ${row.teams.name}`,
            body: `Your recurring L10 is coming up on ${whenLabel}.`,
            actionUrl: l10Url,
            type: "l10_reminder",
          });
        }
      }

      await admin
        .from("meeting_schedules")
        .update({ last_reminder_at: now.toISOString() })
        .eq("id", row.id);

      reminded += 1;
    }

    return jsonResponse({
      success: true,
      processed: data?.length ?? 0,
      reminded,
    });
  },
};

export default handler;
