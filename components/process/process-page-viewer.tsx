import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProcessPageDetail } from "@/features/process/queries";

interface ProcessPageViewerProps {
  page: ProcessPageDetail;
  backHref: string;
  editHref?: string;
}

export function ProcessPageViewer({
  page,
  backHref,
  editHref,
}: ProcessPageViewerProps) {
  const body =
    page.content_format === "sop" && page.content
      ? page.content
      : page.content || "No content yet.";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <PageHeader
        title={page.title}
        description={
          page.team_id ? "Team standard operating procedure" : "Organization SOP"
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={backHref}>Back</Link>
            </Button>
            {editHref ? (
              <Button asChild>
                <Link href={editHref}>Edit</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardContent className="whitespace-pre-wrap pt-6 text-sm leading-relaxed text-foreground">
          {body}
        </CardContent>
      </Card>
    </div>
  );
}
