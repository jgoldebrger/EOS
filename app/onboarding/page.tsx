import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getUserOrganizations } from "@/features/organizations/queries";
import { acceptPendingInvitationsForCurrentUser } from "@/features/people/actions";
import { OnboardingWizard } from "@/features/organizations/components/onboarding-wizard";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const user = await requireUser();

  const acceptResult = await acceptPendingInvitationsForCurrentUser();
  if (acceptResult.success && acceptResult.redirectSlug) {
    redirect(`/org/${acceptResult.redirectSlug}/home`);
  }

  const orgs = await getUserOrganizations();

  if (orgs.length > 0) {
    redirect(`/org/${orgs[0].slug}/home`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40 px-6 py-16">
      <div className="absolute right-6 top-6">
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      <OnboardingWizard userEmail={user.email ?? "your account"} />
    </div>
  );
}
