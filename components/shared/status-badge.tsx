import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "default" | "success" | "warning" | "danger" | "muted";

const STATUS_VARIANTS: Record<string, StatusVariant> = {
  active: "success",
  complete: "success",
  completed: "success",
  done: "success",
  on_track: "success",
  "on track": "success",
  pending: "warning",
  in_progress: "warning",
  "in progress": "warning",
  open: "warning",
  blocked: "danger",
  failed: "danger",
  error: "danger",
  off_track: "danger",
  "off track": "danger",
  cancelled: "muted",
  canceled: "muted",
  draft: "muted",
  archived: "muted",
};

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  default: "border-transparent bg-primary/10 text-primary",
  success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "border-transparent bg-destructive/15 text-destructive",
  muted: "border-transparent bg-muted text-muted-foreground",
};

function resolveVariant(status: string): StatusVariant {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, " ");
  const underscored = normalized.replace(/\s+/g, "_");
  return STATUS_VARIANTS[normalized] ?? STATUS_VARIANTS[underscored] ?? "default";
}

function formatLabel(status: string): string {
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = resolveVariant(status);

  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", VARIANT_CLASSES[variant], className)}
    >
      {formatLabel(status)}
    </Badge>
  );
}
