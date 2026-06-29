import { AlertTriangle } from "lucide-react";
import { getAtRiskReason } from "@/features/rocks/utils";
import type { RockWithOwner } from "@/features/rocks/types";
import { cn } from "@/lib/utils";

interface RockAtRiskIndicatorProps {
  rock: RockWithOwner;
  className?: string;
}

export function RockAtRiskIndicator({ rock, className }: RockAtRiskIndicatorProps) {
  const reason = getAtRiskReason(rock);

  if (!reason) {
    return null;
  }

  return (
    <span
      title={reason}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400",
        className,
      )}
      data-testid="rock-at-risk"
    >
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      At risk
    </span>
  );
}
