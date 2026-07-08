import { NextResponse } from "next/server";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { acceptPendingInvitations } from "@/lib/people/accept-invitations";
import { toSafeRelativePath } from "@/lib/auth/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const user = await getServerSessionUser();

      if (user?.email) {
        const token =
          typeof user.user_metadata?.invitation_token === "string"
            ? user.user_metadata.invitation_token
            : null;

        const { accepted } = await acceptPendingInvitations({
          userId: user.id,
          email: user.email,
          token,
        });

        if (accepted.length > 0) {
          const safeNext = `/org/${accepted[0].orgSlug}/home`;
          return NextResponse.redirect(`${origin}${safeNext}`);
        }
      }

      const safeNext = toSafeRelativePath(next, "/onboarding");
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback`);
}
