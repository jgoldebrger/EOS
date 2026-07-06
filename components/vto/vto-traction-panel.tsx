"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pinVtoLink, unpinVtoLink } from "@/features/vto/actions";
import type { VtoTractionData } from "@/features/vto/queries";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VtoTractionPanelProps {
  organizationId: string;
  canManage: boolean;
  traction: VtoTractionData;
}

export function VtoTractionPanel({
  organizationId,
  canManage,
  traction,
}: VtoTractionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [links, setLinks] = useState(traction.links);

  const pinnedBySection = useMemo(
    () => (sectionKey: string) =>
      new Set(
        links
          .filter((link) => link.sectionKey === sectionKey)
          .map((link) => link.entityId),
      ),
    [links],
  );

  const linkIdByEntity = (entityId: string) =>
    links.find((link) => link.entityId === entityId)?.id;

  function refresh() {
    router.refresh();
  }

  function togglePinOptimistic(
    entityId: string,
    sectionKey: string,
    title: string,
    entityType: "rock" | "issue" | "metric",
    isPinned: boolean,
  ) {
    startTransition(async () => {
      const linkId = linkIdByEntity(entityId);
      const previousLinks = links;

      if (isPinned && linkId) {
        setLinks((current) => current.filter((link) => link.id !== linkId));
      } else {
        setLinks((current) => [
          ...current,
          {
            id: `optimistic-${entityId}`,
            entityId,
            sectionKey,
            title,
            entityType,
          },
        ]);
      }

      const result = isPinned && linkId
        ? await unpinVtoLink({ organizationId, linkId })
        : await pinVtoLink({
            organizationId,
            entityType,
            entityId,
            sectionKey,
          });

      if (!result.success) {
        setLinks(previousLinks);
        showErrorToast("Could not update pin", result.error);
        return;
      }

      showSuccessToast(isPinned ? "Unpinned" : "Pinned");
      refresh();
    });
  }

  return (
    <div className="space-y-6" data-testid="vto-traction-panel">
      <p className="text-sm text-muted-foreground">
        Traction side of the V/TO — quarterly rocks, long-term issues, and measurables linked to your 1-year plan.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quarterly company rocks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {traction.companyRocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No company rocks this quarter.</p>
            ) : (
              traction.companyRocks.map((rock) => {
                const isPinned = pinnedBySection("quarterly_rocks").has(rock.id);
                return (
                  <div
                    key={rock.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{rock.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {rock.quarter} · {rock.status.replace("_", " ")}
                      </p>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={isPinned ? "secondary" : "outline"}
                        disabled={isPending}
                        onClick={() =>
                          togglePinOptimistic(
                            rock.id,
                            "quarterly_rocks",
                            rock.title,
                            "rock",
                            isPinned,
                          )
                        }
                      >
                        {isPinned ? "Pinned" : "Pin"}
                      </Button>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issues list (company)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {traction.openIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open company-level issues.</p>
            ) : (
              traction.openIssues.map((issue) => {
                const isPinned = pinnedBySection("issues_list").has(issue.id);
                return (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">{issue.status}</p>
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={isPinned ? "secondary" : "outline"}
                        disabled={isPending}
                        onClick={() =>
                          togglePinOptimistic(
                            issue.id,
                            "issues_list",
                            issue.title,
                            "issue",
                            isPinned,
                          )
                        }
                      >
                        {isPinned ? "Pinned" : "Pin"}
                      </Button>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1-year plan measurables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {traction.metrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No org-level scorecard metrics.</p>
            ) : (
              traction.metrics.map((metric) => {
                const isPinned = pinnedBySection("one_year_plan").has(metric.id);
                return (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      {metric.goal ? (
                        <p className="text-xs text-muted-foreground">Goal: {metric.goal}</p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={isPinned ? "secondary" : "outline"}
                        disabled={isPending}
                        onClick={() =>
                          togglePinOptimistic(
                            metric.id,
                            "one_year_plan",
                            metric.name,
                            "metric",
                            isPinned,
                          )
                        }
                      >
                        {isPinned ? "Pinned" : "Pin"}
                      </Button>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {links.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pinned to V/TO</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Badge key={link.id} variant="secondary">
                {link.title} ({link.sectionKey.replace(/_/g, " ")})
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
