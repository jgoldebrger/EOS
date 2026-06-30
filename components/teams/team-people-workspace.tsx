"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserMinus } from "lucide-react";
import { addTeamMember, removeTeamMember } from "@/features/teams/actions";
import type { OrgMemberOption, TeamMemberPerson } from "@/features/teams/types";
import type { TeamRole } from "@/types/domain";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TeamPeopleWorkspaceProps {
  teamId: string;
  organizationId: string;
  members: TeamMemberPerson[];
  availablePeople: OrgMemberOption[];
  canManage: boolean;
}

const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  leader: "Leader",
  member: "Member",
  viewer: "Viewer",
};

export function TeamPeopleWorkspace({
  teamId,
  organizationId,
  members,
  availablePeople,
  canManage,
}: TeamPeopleWorkspaceProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!selectedUserId) {
      showErrorToast("Select a person", "Choose someone from your organization.");
      return;
    }

    setIsSubmitting(true);
    const result = await addTeamMember({
      teamId,
      organizationId,
      userId: selectedUserId,
      teamRole: selectedRole,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not add person", result.error);
      return;
    }

    showSuccessToast("Person added to team");
    setOpen(false);
    setSelectedUserId("");
    setSelectedRole("member");
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    const result = await removeTeamMember({
      teamId,
      organizationId,
      memberId,
    });
    setRemovingId(null);

    if (!result.success) {
      showErrorToast("Could not remove person", result.error);
      return;
    }

    showSuccessToast("Person removed from team");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">People</h2>
          <p className="text-sm text-muted-foreground">
            Organization users who belong to this team.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" disabled={availablePeople.length === 0}>
                <Plus className="h-3.5 w-3.5" />
                Add person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add person to team</DialogTitle>
                <DialogDescription>
                  Choose an organization member to add to this team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-add-person">Person</Label>
                  <select
                    id="team-add-person"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">Select a person</option>
                    {availablePeople.map((person) => (
                      <option key={person.userId} value={person.userId}>
                        {person.displayName}
                        {person.email ? ` (${person.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-add-role">Team role</Label>
                  <select
                    id="team-add-role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as TeamRole)}
                  >
                    <option value="leader">Leader</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={isSubmitting || !selectedUserId}>
                  {isSubmitting ? "Adding…" : "Add to team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {members.length === 0 ? (
        <EmptyState
          title="No people on this team"
          description={
            canManage
              ? "Add organization members so they can work in this team workspace."
              : "Team leaders and org admins can add people to this team."
          }
        />
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <OwnerAvatar name={member.displayName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.displayName}</p>
                    {member.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {TEAM_ROLE_LABELS[member.teamRole]}
                  </Badge>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={removingId === member.id}
                      onClick={() => handleRemove(member.id)}
                      aria-label={`Remove ${member.displayName} from team`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}

      {canManage && availablePeople.length === 0 && members.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Everyone in your organization is already on this team.
        </p>
      )}
    </div>
  );
}
