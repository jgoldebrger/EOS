import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { isSelfServiceOrgCreationEnabled } from "@/lib/auth/platform-access";
import { getUserOrganizations } from "@/features/organizations/queries";
import { OnboardingWizard } from "@/features/organizations/components/onboarding-wizard";
import { RequestAccessPanel } from "@/features/organizations/components/request-access-panel";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const user = await requireUser();

  // Invites require an explicit token (/auth/invite?token=…); never bulk-accept by email.
  const orgs = await getUserOrganizations();

  if (orgs.length > 0) {
    redirect(`/org/${orgs[0].slug}/home`);
  }

  const selfService = isSelfServiceOrgCreationEnabled();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40 px-6 py-16">
      <div className="absolute right-6 top-6">
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      {selfService ? (
        <OnboardingWizard userEmail={user.email ?? "your account"} />
      ) : (
        <RequestAccessPanel userEmail={user.email ?? "your account"} />
      )}
    </div>
  );
}
