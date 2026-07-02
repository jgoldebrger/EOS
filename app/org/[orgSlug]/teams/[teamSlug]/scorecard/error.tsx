"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScorecardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Scorecard failed to load</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {error.message || "Something went wrong while loading this scorecard."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Reload</Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
