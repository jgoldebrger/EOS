"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCarrier } from "@/features/transport/actions";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateCarrierDialogProps {
  organizationId: string;
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCarrierDialog({
  organizationId,
  orgSlug,
  open,
  onOpenChange,
}: CreateCarrierDialogProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      showErrorToast("Name required", "Enter a carrier name.");
      return;
    }

    setIsSubmitting(true);
    const result = await createCarrier({
      organizationId,
      orgSlug,
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create carrier", result.error);
      return;
    }

    showSuccessToast("Carrier created");
    setName("");
    setContactName("");
    setContactPhone("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New carrier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contact name</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create carrier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
