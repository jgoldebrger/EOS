import { redirect } from "next/navigation";
import { AuthMfaVerifyPanel } from "@/components/auth/auth-mfa-verify-panel";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { loadMfaStatus } from "@/lib/auth/mfa-client";
import { toSafeRelativePath } from "@/lib/auth/safe-redirect";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AuthMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = toSafeRelativePath(next, "/onboarding");

  const user = await getServerSessionUser();
  if (!user) {
    redirect("/auth");
  }

  const supabase = await createClient();
  const status = await loadMfaStatus(supabase);

  if ("error" in status) {
    redirect("/auth?error=callback");
  }

  if (!status.needsStepUp) {
    redirect(safeNext);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your identity</CardTitle>
          <CardDescription>
            Enter the code from your authenticator app to finish signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthMfaVerifyPanel
            factorId={status.verifiedFactor?.id}
            redirectTo={safeNext}
          />
        </CardContent>
      </Card>
    </div>
  );
}
