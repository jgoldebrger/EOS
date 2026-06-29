import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OverdueBadgeProps {
  className?: string;
}

export function OverdueBadge({ className }: OverdueBadgeProps) {
  return (
    <Badge
      variant="outline"
      data-testid="todo-overdue-badge"
      className={cn(
        "border-transparent bg-destructive/15 font-medium text-destructive",
        className,
      )}
    >
      Overdue
    </Badge>
  );
}
