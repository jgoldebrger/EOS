import Link from "next/link";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getInboxForUser } from "@/features/inbox/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";

export default async function InboxPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = user
    ? await getInboxForUser(access.orgId, user.id)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader title="Inbox" description="Items assigned to you." />
      {items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="Inbox zero" description="No assigned items right now." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={item.read_at ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {item.action_url ? (
                    <Link href={item.action_url} className="hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </CardTitle>
              </CardHeader>
              {item.body && <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
