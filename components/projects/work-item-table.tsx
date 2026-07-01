"use client";

import type { WorkItemWithMeta } from "@/features/projects/types";
import { formatWorkItemState } from "@/features/projects/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface WorkItemRow {
  item: WorkItemWithMeta;
  depth: number;
}

interface WorkItemTableProps {
  rows: WorkItemRow[];
  onSelect: (item: WorkItemWithMeta) => void;
}

function WorkItemCard({
  item,
  depth,
  onSelect,
}: WorkItemRow & { onSelect: (item: WorkItemWithMeta) => void }) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      style={{ marginLeft: depth * 12 }}
      onClick={() => onSelect(item)}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {item.identifier}
            {item.parentIdentifier && (
              <span className="ml-2 font-sans text-muted-foreground/80">
                subtask of {item.parentIdentifier}
              </span>
            )}
          </span>
          <Badge variant="secondary" className="capitalize shrink-0">
            {formatWorkItemState(item.state)}
          </Badge>
        </div>
        <p className="font-medium leading-snug">{item.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{item.priority}</span>
          <span>·</span>
          <span>{item.assignee.label}</span>
        </div>
        {item.labelNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.labelNames.map((name) => (
              <Badge key={name} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkItemTable({ rows, onSelect }: WorkItemTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No tasks match your filters.
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Labels</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, depth }) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => onSelect(item)}
              >
                <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
                <TableCell className="font-medium">
                  <span
                    className={cn(depth > 0 && "text-muted-foreground")}
                    style={{ paddingLeft: depth * 16 }}
                  >
                    {depth > 0 && "↳ "}
                    {item.title}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {formatWorkItemState(item.state)}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{item.priority}</TableCell>
                <TableCell>{item.assignee.label}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {item.labelNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="block space-y-3 md:hidden">
        {rows.map((row) => (
          <WorkItemCard key={row.item.id} {...row} onSelect={onSelect} />
        ))}
      </div>
    </>
  );
}
