import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-6 py-24">
      <main className="w-full max-w-2xl space-y-10 text-center">
        <div className="space-y-4">
          <Badge variant="secondary" className="mx-auto">
            EOS Business Operating System
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Run your business on EOS
          </h1>
          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Scorecards, rocks, issues, todos, and L10 meetings — one platform
            for traction and accountability.
          </p>
        </div>

        <Card className="text-left">
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Sign in with an invitation or enterprise SSO to access your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs">Documentation</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
