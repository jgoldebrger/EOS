"use client";

import Link from "next/link";
import type { TransportLoadWithMeta } from "@/features/transport/types";
import { formatLoadStatus, groupLoadsByStatus } from "@/features/transport/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DispatchBoardProps {
  orgSlug: string;
  loads: TransportLoadWithMeta[];
  onSelect?: (load: TransportLoadWithMeta) => void;
}

export function DispatchBoard({ orgSlug, loads, onSelect }: DispatchBoardProps) {
  const columns = groupLoadsByStatus(loads);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[...columns.entries()].map(([status, colLoads]) => (
        <Card key={status} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm capitalize">
              {formatLoadStatus(status)}
              <Badge variant="secondary">{colLoads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-2">
            {colLoads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No loads</p>
            ) : (
              colLoads.map((load) => (
                <Link
                  key={load.id}
                  href={`/org/${orgSlug}/transport/${load.id}`}
                  onClick={() => onSelect?.(load)}
                  className="block rounded-md border bg-card p-3 text-sm shadow-xs transition-colors hover:bg-muted/50"
                >
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {load.loadLabel}
                  </p>
                  <p className="font-medium leading-snug">
                    {load.customer_name ?? "Unnamed customer"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {load.stopCount} stops
                    {load.driverLabel ? ` · ${load.driverLabel}` : ""}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
