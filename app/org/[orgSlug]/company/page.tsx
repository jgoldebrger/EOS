import Link from "next/link";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const base = `/org/${orgSlug}`;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader
        title="Company"
        description="Company-wide vision, traction, and strategic tools."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`${base}/vto`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Vision / Traction Organizer</CardTitle>
              <CardDescription>Core values, 10-year target, 1-year plan</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${base}/accountability`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Accountability Chart</CardTitle>
              <CardDescription>Seats, roles, and responsibilities</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${base}/rocks?scope=company`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Company Rocks</CardTitle>
              <CardDescription>Quarterly company-level priorities</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
