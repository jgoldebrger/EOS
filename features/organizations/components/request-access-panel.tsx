import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RequestAccessPanelProps {
  userEmail: string;
}

export function RequestAccessPanel({ userEmail }: RequestAccessPanelProps) {
  return (
    <div className="w-full max-w-lg space-y-6" data-testid="request-access-panel">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Request access</h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitation required</CardTitle>
          <CardDescription>
            This platform is invite-only. Ask an organization administrator to send you an
            invitation, then return here after accepting it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/auth/invite">Check pending invitations</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
