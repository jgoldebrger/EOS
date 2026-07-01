"use client";

import type { WorkItemWithMeta } from "@/features/projects/types";
import { formatWorkItemState } from "@/features/projects/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkItemTableProps {
  items: WorkItemWithMeta[];
  onSelect: (item: WorkItemWithMeta) => void;
}

export function WorkItemTable({ items, onSelect }: WorkItemTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No work items match your filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignee</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={item.id}
            className="cursor-pointer"
            onClick={() => onSelect(item)}
          >
            <TableCell className="font-mono text-xs">{item.identifier}</TableCell>
            <TableCell className="font-medium">{item.title}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {formatWorkItemState(item.state)}
              </Badge>
            </TableCell>
            <TableCell className="capitalize">{item.priority}</TableCell>
            <TableCell>{item.assignee.label}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
