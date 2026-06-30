"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";

interface ProcessWorkspaceProps {
  pages: Array<{ id: string; title: string; content: string; parent_id: string | null }>;
}

export function ProcessWorkspace({ pages }: ProcessWorkspaceProps) {
  if (pages.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="No process docs"
        description="Document standard operating procedures for this team."
      />
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <Card key={page.id}>
          <CardHeader>
            <CardTitle className="text-base">{page.title}</CardTitle>
          </CardHeader>
          {page.content && (
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {page.content}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
