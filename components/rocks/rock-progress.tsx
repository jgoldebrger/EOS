import { cn } from "@/lib/utils";

interface RockProgressProps {
  value: number;
  className?: string;
}

export function RockProgress({ value, className }: RockProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="rock-progress">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            clamped >= 100
              ? "bg-emerald-500"
              : clamped >= 50
                ? "bg-primary"
                : "bg-amber-500",
          )}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {clamped}%
      </span>
    </div>
  );
}
