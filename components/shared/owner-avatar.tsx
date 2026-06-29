import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

interface OwnerAvatarProps {
  name: string;
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

export function OwnerAvatar({
  name,
  imageUrl,
  className,
  size = "md",
}: OwnerAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar
      className={cn(SIZE_CLASSES[size], className)}
      title={name}
      aria-label={name}
    >
      {imageUrl && <AvatarImage src={imageUrl} alt="" />}
      <AvatarFallback className="font-medium">{initials}</AvatarFallback>
    </Avatar>
  );
}
