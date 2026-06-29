"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { deleteSeat } from "@/features/accountability/actions";
import type { SeatMemberOption, SeatNode } from "@/features/accountability/types";
import { AccountabilityChart } from "@/components/accountability/accountability-chart";
import { AssignSeatDialog } from "@/components/accountability/assign-seat-dialog";
import { CreateSeatDialog } from "@/components/accountability/create-seat-dialog";
import { EditSeatDialog } from "@/components/accountability/edit-seat-dialog";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface AccountabilityWorkspaceProps {
  organizationId: string;
  canManage: boolean;
  tree: SeatNode[];
  members: SeatMemberOption[];
}

export function AccountabilityWorkspace({
  organizationId,
  canManage,
  tree,
  members,
}: AccountabilityWorkspaceProps) {
  const [editingSeat, setEditingSeat] = useState<SeatNode | null>(null);
  const [assigningSeat, setAssigningSeat] = useState<SeatNode | null>(null);
  const [deletingSeat, setDeletingSeat] = useState<SeatNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deletingSeat) return;

    setIsDeleting(true);
    const result = await deleteSeat({
      organizationId,
      seatId: deletingSeat.id,
    });
    setIsDeleting(false);

    if (!result.success) {
      showErrorToast("Could not delete seat", result.error);
      return;
    }

    showSuccessToast("Seat deleted");
    setDeletingSeat(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accountability Chart"
        description="Map roles and responsibilities across your organization. Seats form a hierarchy from leadership down."
        actions={
          canManage ? (
            <CreateSeatDialog organizationId={organizationId} seats={tree} />
          ) : undefined
        }
      />

      {tree.length === 0 ? (
        <EmptyState
          title="No seats yet"
          description={
            canManage
              ? "Add your first seat to start building the accountability chart."
              : "An admin has not configured the accountability chart yet."
          }
          icon={<Network className="h-6 w-6" />}
          action={
            canManage ? (
              <CreateSeatDialog organizationId={organizationId} seats={tree} />
            ) : undefined
          }
        />
      ) : (
        <AccountabilityChart
          tree={tree}
          canManage={canManage}
          onEditSeat={canManage ? setEditingSeat : undefined}
          onDeleteSeat={canManage ? setDeletingSeat : undefined}
          onAssignSeat={canManage ? setAssigningSeat : undefined}
        />
      )}

      <EditSeatDialog
        organizationId={organizationId}
        seat={editingSeat}
        seats={tree}
        open={editingSeat !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSeat(null);
        }}
      />

      <AssignSeatDialog
        organizationId={organizationId}
        seat={assigningSeat}
        members={members}
        open={assigningSeat !== null}
        onOpenChange={(open) => {
          if (!open) setAssigningSeat(null);
        }}
      />

      <ConfirmDialog
        open={deletingSeat !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingSeat(null);
        }}
        title="Delete seat"
        description={
          deletingSeat
            ? `Remove "${deletingSeat.title}" from the accountability chart? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete seat"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
