"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { inviteOrgMember } from "@/features/people/actions";
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

interface InvitePersonDialogProps {
  organizationId: string;
  orgSlug: string;
}

const INVITE_ROLES: { value: Exclude<OrgRole, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function InvitePersonDialog({
  organizationId,
  orgSlug,
}: InvitePersonDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [orgRole, setOrgRole] = useState<Exclude<OrgRole, "owner">>("member");
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setEmail("");
    setOrgRole("member");
    setSendEmail(true);
  }

  async function handleSubmit() {
    if (!email.trim()) {
      showErrorToast("Email required", "Enter the person's email address.");
      return;
    }

    setIsSubmitting(true);
    const result = await inviteOrgMember({
      organizationId,
      orgSlug,
      email: email.trim(),
      orgRole,
      sendEmail,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not invite person", result.error);
      return;
    }

    if (result.mode === "added") {
      showSuccessToast("Person added to organization");
    } else if (result.emailSent) {
      showSuccessToast("Invite sent", "They will receive an email to sign up.");
    } else {
      showSuccessToast(
        "Pending invite created",
        "No email was sent. They can be added when they sign up.",
      );
    }

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
        <Button size="sm" className="gap-1">
          <UserPlus className="h-3.5 w-3.5" />
          Invite person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite person</DialogTitle>
          <DialogDescription>
            Add someone by email. Existing users join immediately. For new users,
            a pending invite is created; optionally send them a sign-up email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-org-role">Organization role</Label>
            <select
              id="invite-org-role"
              className={selectClassName}
              value={orgRole}
              onChange={(event) =>
                setOrgRole(event.target.value as Exclude<OrgRole, "owner">)
              }
            >
              {INVITE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="invite-send-email"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={sendEmail}
              onChange={(event) => setSendEmail(event.target.checked)}
            />
            <label htmlFor="invite-send-email" className="text-sm text-muted-foreground">
              Send invite email
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email.trim()}>
            {isSubmitting
              ? sendEmail
                ? "Sending…"
                : "Creating…"
              : sendEmail
                ? "Send invite"
                : "Create invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
