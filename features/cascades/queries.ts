import { createClient } from "@/lib/supabase/server";

export interface CascadeDeliveryRow {
  id: string;
  sourceType: "headline" | "meeting_message";
  sourceLabel: string;
  targetTeamId: string;
  targetTeamName: string;
  status: "pending" | "acknowledged";
  deliveredAt: string;
  acknowledgedAt: string | null;
}

export async function getCascadeDeliveriesForOrg(
  organizationId: string,
): Promise<CascadeDeliveryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cascade_deliveries")
    .select("id, source_type, source_label, target_team_id, status, delivered_at, acknowledged_at, teams(name)")
    .eq("organization_id", organizationId)
    .order("delivered_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const teamJoin = row.teams as { name: string } | null;
    return {
      id: row.id,
      sourceType: row.source_type as CascadeDeliveryRow["sourceType"],
      sourceLabel: row.source_label,
      targetTeamId: row.target_team_id,
      targetTeamName: teamJoin?.name ?? "Team",
      status: row.status as CascadeDeliveryRow["status"],
      deliveredAt: row.delivered_at,
      acknowledgedAt: row.acknowledged_at,
    };
  });
}

export async function getCascadeCompletionMetric(organizationId: string) {
  const supabase = await createClient();
  const [total, acknowledged] = await Promise.all([
    supabase
      .from("cascade_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("cascade_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "acknowledged"),
  ]);

  const totalCount = total.count ?? 0;
  const ackCount = acknowledged.count ?? 0;

  return {
    total: totalCount,
    acknowledged: ackCount,
    completionPct: totalCount > 0 ? Math.round((ackCount / totalCount) * 100) : 0,
  };
}
