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
        <Link href={`${base}/process`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Process / SOPs</CardTitle>
              <CardDescription>Organization-wide standard operating procedures</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${base}/company/rocks`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Company Rocks</CardTitle>
              <CardDescription>Quarterly company-level priorities</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${base}/meetings`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>Meetings</CardTitle>
              <CardDescription>L10 meetings and recaps across teams</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href={`${base}/people/analyzer`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>People Analyzer</CardTitle>
              <CardDescription>Right Person / Right Seat quarterly reviews</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
