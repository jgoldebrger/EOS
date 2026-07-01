"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createOrgUserAccount } from "@/features/people/actions";
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

interface CreateAccountDialogProps {
  organizationId: string;
  orgSlug: string;
}

const ACCOUNT_ROLES: { value: Exclude<OrgRole, "owner">; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
];

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CreateAccountDialog({
  organizationId,
  orgSlug,
}: CreateAccountDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgRole, setOrgRole] = useState<Exclude<OrgRole, "owner">>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOrgRole("member");
  }

  async function handleSubmit() {
    if (!email.trim()) {
      showErrorToast("Email required", "Enter the person's email address.");
      return;
    }

    if (password.length < 8) {
      showErrorToast(
        "Password too short",
        "Password must be at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast("Passwords do not match", "Re-enter both passwords.");
      return;
    }

    setIsSubmitting(true);
    const result = await createOrgUserAccount({
      organizationId,
      orgSlug,
      email: email.trim(),
      password,
      orgRole,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create account", result.error);
      return;
    }

    showSuccessToast(
      "Account created",
      "They can sign in immediately. Share the password securely — no email was sent.",
    );
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
          <KeyRound className="h-3.5 w-3.5" />
          Create account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Create a login for someone who does not have an account yet. They
            can sign in immediately with the password you set. No email is sent
            — share the credentials yourself.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-account-email">Email</Label>
            <Input
              id="create-account-email"
              type="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-account-password">Password</Label>
            <Input
              id="create-account-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-account-confirm-password">
              Confirm password
            </Label>
            <Input
              id="create-account-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-account-org-role">Organization role</Label>
            <select
              id="create-account-org-role"
              className={selectClassName}
              value={orgRole}
              onChange={(event) =>
                setOrgRole(event.target.value as Exclude<OrgRole, "owner">)
              }
            >
              {ACCOUNT_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !email.trim() ||
              !password ||
              !confirmPassword
            }
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
