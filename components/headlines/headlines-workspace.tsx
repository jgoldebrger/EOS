"use client";

import { useState } from "react";
import { createHeadline } from "@/features/headlines/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Megaphone } from "lucide-react";

interface HeadlinesWorkspaceProps {
  organizationId: string;
  teamId: string;
  canCreate: boolean;
  headlines: Array<{
    id: string;
    title: string;
    body: string;
    headline_type: string;
    created_at: string;
  }>;
}

export function HeadlinesWorkspace({
  organizationId,
  teamId,
  canCreate,
  headlines: initial,
}: HeadlinesWorkspaceProps) {
  const [headlines, setHeadlines] = useState(initial);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"customer" | "employee">("customer");

  async function handleCreate() {
    if (!title.trim()) return;
    const result = await createHeadline({
      organizationId,
      teamId,
      title: title.trim(),
      headlineType: type,
    });
    if (result.success) {
      setHeadlines([
        {
          id: crypto.randomUUID(),
          title: title.trim(),
          body: "",
          headline_type: type,
          created_at: new Date().toISOString(),
        },
        ...headlines,
      ]);
      setTitle("");
    }
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Headline title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-md"
            aria-label="Headline title"
          />
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as "customer" | "employee")}
            aria-label="Headline type"
          >
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
          </select>
          <Button onClick={handleCreate}>Add headline</Button>
        </div>
      )}
      {headlines.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No headlines"
          description="Share customer and employee wins with your team."
        />
      ) : (
        <div className="space-y-3">
          {headlines.map((h) => (
            <Card key={h.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{h.title}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {h.headline_type}
                  </Badge>
                </div>
              </CardHeader>
              {h.body && <CardContent className="text-sm text-muted-foreground">{h.body}</CardContent>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
