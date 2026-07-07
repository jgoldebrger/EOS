import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSessionUser } from "@/lib/supabase/server";
import { getUserOrganizations } from "@/features/organizations/queries";
import { AuthForm } from "@/app/auth/components/auth-form";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AuthPage() {
  const user = await getServerSessionUser();

  if (user) {
    const orgs = await getUserOrganizations();
    if (orgs.length > 0) {
      redirect(`/org/${orgs[0].slug}/dashboard`);
    }
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/40 px-6 py-16">
      <Suspense
        fallback={
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="mx-auto h-6 w-24" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
