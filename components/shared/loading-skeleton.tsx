import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  label?: string;
}

export function LoadingSkeleton({
  rows = 3,
  className,
  label = "Loading content",
}: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("space-y-3", className)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function TableLoadingSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading table" aria-busy="true" className={className}>
      <div className="mb-3 flex gap-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-8 flex-1" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Skeleton key={rowIndex} className="h-10 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading table</span>
    </div>
  );
}
