import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getUserOrganizations } from "@/features/organizations/queries";
import { RequestAccessPanel } from "@/features/organizations/components/request-access-panel";

export default async function RequestAccessPage() {
  const user = await requireUser();
  const orgs = await getUserOrganizations();

  if (orgs.length > 0) {
    redirect(`/org/${orgs[0].slug}/home`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40 px-6 py-16">
      <RequestAccessPanel userEmail={user.email ?? "your account"} />
    </div>
  );
}
