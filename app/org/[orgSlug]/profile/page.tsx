import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getCurrentUserProfile } from "@/features/profile/queries";
import { ProfileForm } from "@/components/profile/profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/auth");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-muted-foreground">
          Update how your name appears across the workspace.
        </p>
      </div>

      <Card data-testid="user-profile-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5" />
            {profile.displayName}
          </CardTitle>
          <CardDescription>
            This name is shown on scorecards, issues, teams, and people lists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm orgSlug={orgSlug} profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
