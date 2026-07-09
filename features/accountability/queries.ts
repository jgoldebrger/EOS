import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
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

  const assigneeProfiles = await resolveOwnerProfiles(
    seats.map((seat) => seat.assigned_user_id),
    organizationId,
  );

  return seats.map((seat) => {
    const assigneeId = seat.assigned_user_id;
    const assigneeProfile = assigneeId
      ? assigneeProfiles.get(assigneeId)
      : undefined;

    return {
      ...seat,
      assignee: assigneeId
        ? {
            userId: assigneeId,
            label: ownerLabelFromProfiles(assigneeProfiles, assigneeId),
            email: assigneeProfile?.email ?? null,
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
  return getOrgMemberOptions(organizationId);
}
