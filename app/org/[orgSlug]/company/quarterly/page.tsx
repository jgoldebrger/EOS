import Link from "next/link";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getQuarterlyPulseData } from "@/features/quarterly/queries";
import { QuarterlyPulseWorkspace } from "@/components/company/quarterly-pulse-workspace";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getCurrentQuarter } from "@/features/rocks/utils";

export default async function QuarterlyPulsePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ quarter?: string }>;
}) {
  const { orgSlug } = await params;
  const { quarter: quarterParam } = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const quarter = quarterParam ?? getCurrentQuarter();
  const pulse = await getQuarterlyPulseData(access.orgId, orgSlug, quarter);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/org/${orgSlug}/company`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Company
        </Link>
      </Button>
      <PageHeader
        title="Quarterly pulse"
        description="EOS quarterly planning checklist for leadership."
      />
      <QuarterlyPulseWorkspace data={pulse} />
    </div>
  );
}
