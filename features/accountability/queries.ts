import { createClient } from "@/lib/supabase/server";
import { formatOwnerLabel } from "@/features/scorecard/utils";
import { buildTree } from "@/features/accountability/utils";
import type {
  SeatMemberOption,
  SeatNode,
  SeatWithAssignee,
} from "@/features/accountability/types";

export async function getSeatsForOrg(
  organizationId: string,
): Promise<SeatWithAssignee[]> {
  const supabase = await createClient();

  const { data: seats, error } = await supabase
    .from("accountability_seats")
    .select("*")
    .eq("organization_id", organizationId)
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });

  if (error || !seats) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return seats.map((seat) => {
    const assigneeId = seat.assigned_user_id;
    const assigneeEmail =
      assigneeId && user?.id === assigneeId ? currentEmail : null;

    return {
      ...seat,
      assignee: assigneeId
        ? {
            userId: assigneeId,
            label: formatOwnerLabel(assigneeId, assigneeEmail),
            email: assigneeEmail,
          }
        : null,
    };
  });
}

export function buildSeatTree(flat: SeatWithAssignee[]): SeatNode[] {
  return buildTree(flat);
}

export async function getOrgMembersForAccountability(
  organizationId: string,
): Promise<SeatMemberOption[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, org_role")
    .eq("organization_id", organizationId)
    .in("org_role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((member) => ({
    userId: member.user_id,
    orgRole: member.org_role,
    label:
      user?.id === member.user_id
        ? formatOwnerLabel(member.user_id, user.email)
        : formatOwnerLabel(member.user_id),
  }));
}
