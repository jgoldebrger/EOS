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

  if (!token?.trim()) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md" data-testid="invite-accept-page">
          <CardHeader>
            <CardTitle>Organization invitation</CardTitle>
            <CardDescription>
              This invite link is missing a token. Open the link from your invitation
              email, or ask an admin to resend the invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/request-access">Continue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await acceptPendingInvitationsForCurrentUser(token);

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
            <Link href="/request-access">Continue</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
