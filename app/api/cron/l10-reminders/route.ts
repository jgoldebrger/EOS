import { NextResponse } from "next/server";
import { processL10ScheduleReminders } from "@/features/meetings/schedule-reminders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await processL10ScheduleReminders();
  return NextResponse.json({ success: true, ...result });
}
