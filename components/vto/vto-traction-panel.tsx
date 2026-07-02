"use client";

import { useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  const pinnedBySection = (sectionKey: string) =>
    new Set(
      traction.links
        .filter((link) => link.sectionKey === sectionKey)
        .map((link) => link.entityId),
    );

  const linkIdByEntity = (entityId: string) =>
    traction.links.find((link) => link.entityId === entityId)?.id;

  function refresh() {
    startTransition(() => {
      window.location.reload();
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
                          startTransition(async () => {
                            const linkId = linkIdByEntity(rock.id);
                            const result = isPinned && linkId
                              ? await unpinVtoLink({ organizationId, linkId })
                              : await pinVtoLink({
                                  organizationId,
                                  entityType: "rock",
                                  entityId: rock.id,
                                  sectionKey: "quarterly_rocks",
                                });
                            if (!result.success) {
                              showErrorToast("Could not update pin", result.error);
                              return;
                            }
                            showSuccessToast(isPinned ? "Unpinned" : "Pinned");
                            refresh();
                          })
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
                          startTransition(async () => {
                            const linkId = linkIdByEntity(issue.id);
                            const result = isPinned && linkId
                              ? await unpinVtoLink({ organizationId, linkId })
                              : await pinVtoLink({
                                  organizationId,
                                  entityType: "issue",
                                  entityId: issue.id,
                                  sectionKey: "issues_list",
                                });
                            if (!result.success) {
                              showErrorToast("Could not update pin", result.error);
                              return;
                            }
                            showSuccessToast(isPinned ? "Unpinned" : "Pinned");
                            refresh();
                          })
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
                          startTransition(async () => {
                            const linkId = linkIdByEntity(metric.id);
                            const result = isPinned && linkId
                              ? await unpinVtoLink({ organizationId, linkId })
                              : await pinVtoLink({
                                  organizationId,
                                  entityType: "metric",
                                  entityId: metric.id,
                                  sectionKey: "one_year_plan",
                                });
                            if (!result.success) {
                              showErrorToast("Could not update pin", result.error);
                              return;
                            }
                            showSuccessToast(isPinned ? "Unpinned" : "Pinned");
                            refresh();
                          })
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

      {traction.links.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pinned to V/TO</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {traction.links.map((link) => (
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
