import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { acceptPendingInvitationsForCurrentUser } from "@/features/people/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  await requireUser();

  const result = await acceptPendingInvitationsForCurrentUser(token ?? null);

  if (result.success && result.redirectSlug) {
    redirect(`/org/${result.redirectSlug}/home`);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md" data-testid="invite-accept-page">
        <CardHeader>
          <CardTitle>Organization invitation</CardTitle>
          <CardDescription>
            {result.success && result.acceptedCount === 0
              ? "No pending invitations were found for your account. Ask an admin to send a new invite."
              : "We could not accept this invitation."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result.success ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : null}
          <Button asChild>
            <Link href="/onboarding">Continue</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
