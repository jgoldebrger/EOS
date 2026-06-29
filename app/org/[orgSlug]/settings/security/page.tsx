import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          Manage authentication and access controls for your organization.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Single sign-on
            </CardTitle>
            <CardDescription>
              Configure enterprise SSO, domain verification, and role mappings.
            </CardDescription>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/org/${orgSlug}/settings/security/sso`}>Manage SSO</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
