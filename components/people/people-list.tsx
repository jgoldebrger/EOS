"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateReportsTo } from "@/features/people/actions";
import type { OrgPersonWithManager } from "@/features/people/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PeopleListProps {
  organizationId: string;
  orgSlug: string;
  people: OrgPersonWithManager[];
  canManage: boolean;
}

const selectClassName =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function PeopleList({
  organizationId,
  orgSlug,
  people,
  canManage,
}: PeopleListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleManagerChange(userId: string, reportsToUserId: string) {
    startTransition(async () => {
      const result = await updateReportsTo({
        organizationId,
        orgSlug,
        userId,
        reportsToUserId: reportsToUserId || null,
      });

      if (!result.success) {
        showErrorToast("Could not update manager", result.error);
        return;
      }

      showSuccessToast("Reporting line updated");
      router.refresh();
    });
  }

  return (
    <ul className="space-y-2">
      {people.map((member) => {
        const managerOptions = people.filter((person) => person.userId !== member.userId);

        return (
          <Card key={member.userId}>
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <OwnerAvatar name={member.displayName} size="sm" />
                <div>
                  <p className="text-sm font-medium">{member.displayName}</p>
                  {member.managerName ? (
                    <p className="text-xs text-muted-foreground">
                      Reports to {member.managerName}
                    </p>
                  ) : null}
                  {member.seatTitle ? (
                    <p className="text-xs text-muted-foreground">Seat: {member.seatTitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canManage ? (
                  <select
                    className={selectClassName}
                    value={member.reportsToUserId ?? ""}
                    disabled={isPending}
                    onChange={(event) =>
                      handleManagerChange(member.userId, event.target.value)
                    }
                    aria-label={`Manager for ${member.displayName}`}
                  >
                    <option value="">No manager</option>
                    {managerOptions.map((person) => (
                      <option key={person.userId} value={person.userId}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                ) : null}
                <Badge variant="secondary" className="capitalize">
                  {member.orgRole}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </ul>
  );
}
