"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/features/profile/actions";
import type { UserProfile } from "@/features/profile/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  orgSlug: string;
  profile: UserProfile;
}

export function ProfileForm({ orgSlug, profile }: ProfileFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!firstName.trim()) {
      showErrorToast("First name required", "Enter your first name.");
      return;
    }

    if (!lastName.trim()) {
      showErrorToast("Last name required", "Enter your last name.");
      return;
    }

    setIsSubmitting(true);
    const result = await updateProfile({
      orgSlug,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not update profile", result.error);
      return;
    }

    showSuccessToast("Profile updated", "Your name is updated across the workspace.");
    router.refresh();
  }

  const hasChanges =
    firstName.trim() !== profile.firstName.trim() ||
    lastName.trim() !== profile.lastName.trim();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={profile.email ?? ""}
          disabled
          className="bg-muted/50"
        />
        <p className="text-xs text-muted-foreground">
          Contact an admin if you need to change your sign-in email.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-first-name">First name</Label>
          <Input
            id="profile-first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-last-name">Last name</Label>
          <Input
            id="profile-last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !hasChanges || !firstName.trim() || !lastName.trim()}
      >
        {isSubmitting ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
