"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { addPersonToOrg } from "@/features/people/actions";
import type { OrgRole } from "@/types/domain";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddPersonDialogProps {
  organizationId: string;
  orgSlug: string;
}

const ADD_ROLES: { value: Exclude<OrgRole, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function AddPersonDialog({
  organizationId,
  orgSlug,
}: AddPersonDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [orgRole, setOrgRole] = useState<Exclude<OrgRole, "owner">>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setEmail("");
    setOrgRole("member");
  }

  async function handleSubmit() {
    if (!email.trim()) {
      showErrorToast("Email required", "Enter the person's email address.");
      return;
    }

    setIsSubmitting(true);
    const result = await addPersonToOrg({
      organizationId,
      orgSlug,
      email: email.trim(),
      orgRole,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not add person", result.error);
      return;
    }

    showSuccessToast("Person added to organization");
    resetForm();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <UserCheck className="h-3.5 w-3.5" />
          Add person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add person</DialogTitle>
          <DialogDescription>
            Add someone who already has an account. They join immediately with no
            invite or email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-person-email">Email</Label>
            <Input
              id="add-person-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-person-org-role">Organization role</Label>
            <select
              id="add-person-org-role"
              className={selectClassName}
              value={orgRole}
              onChange={(event) =>
                setOrgRole(event.target.value as Exclude<OrgRole, "owner">)
              }
            >
              {ADD_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email.trim()}>
            {isSubmitting ? "Adding…" : "Add person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
