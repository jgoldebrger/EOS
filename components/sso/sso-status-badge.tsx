import { Badge } from "@/components/ui/badge";
import type { OrganizationSsoSettings } from "@/features/sso/types";

interface SsoStatusBadgeProps {
  settings: OrganizationSsoSettings | null;
}

export function SsoStatusBadge({ settings }: SsoStatusBadgeProps) {
  if (!settings) {
    return <Badge variant="secondary">Not configured</Badge>;
  }

  if (settings.enforced) {
    return <Badge variant="default">Enforced</Badge>;
  }

  return <Badge variant="outline">Configured</Badge>;
}
