"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SsoEnforcementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function SsoEnforcementDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: SsoEnforcementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enforce SSO for all members?</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              When enforcement is enabled, members must sign in through your identity
              provider. Email and password login will be blocked unless you explicitly
              allow it.
            </p>
            <p className="font-medium text-foreground">
              Make sure SSO is tested and verified domains are configured before
              enforcing.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Enabling…" : "Enable enforcement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
