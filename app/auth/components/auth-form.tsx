"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { signInWithEmail, signUpWithEmail } from "@/app/auth/actions";
import { toSafeAuthError } from "@/lib/auth/errors";
import { oauthProviders } from "@/app/auth/oauth-config";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SsoLoginOption } from "@/components/sso/sso-login-option";

const authSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

type AuthFormValues = z.infer<typeof authSchema>;

type AuthMode = "sign-in" | "sign-up";

export function AuthForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [formError, setFormError] = useState<string | null>(
    callbackError === "callback"
      ? "Sign in was interrupted. Please try again."
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: AuthFormValues) {
    setFormError(null);
    setIsSubmitting(true);

    const nextPath = searchParams.get("next") ?? undefined;

    if (mode === "sign-in") {
      const result = await signInWithEmail({
        email: values.email,
        password: values.password,
        nextPath,
      });

      setIsSubmitting(false);

      if (result?.success === false) {
        setFormError(result.error);
      }
      return;
    }

    const result = await signUpWithEmail({
      email: values.email,
      password: values.password,
    });

    setIsSubmitting(false);

    if (result?.success === false) {
      setFormError(result.error);
      return;
    }

    if (result?.success === true && "needsConfirmation" in result && result.needsConfirmation) {
      setFormError(
        "Check your email to confirm your account, then sign in.",
      );
      setMode("sign-in");
    }
  }

  async function signInWithOAuth(provider: "google" | "azure") {
    setFormError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/onboarding`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      setFormError(toSafeAuthError(error));
    }
  }

  const oauthEnabled = oauthProviders.google || oauthProviders.microsoft;

  return (
    <Card className="w-full max-w-md border-border/60 shadow-lg">
      <CardHeader className="space-y-3 text-center">
        <Badge variant="secondary" className="mx-auto w-fit">
          EOS Platform
        </Badge>
        <CardTitle className="text-2xl">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {mode === "sign-in"
            ? "Sign in to access your organization workspace."
            : "Get started with your EOS operating system."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {oauthEnabled && (
          <>
            <div className="grid gap-3">
              {oauthProviders.google && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signInWithOAuth("google")}
                >
                  Continue with Google
                </Button>
              )}
              {oauthProviders.microsoft && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signInWithOAuth("azure")}
                >
                  Continue with Microsoft
                </Button>
              )}
            </div>
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or continue with SSO
              </span>
            </div>
          </>
        )}

        {!oauthEnabled && (
          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              enterprise SSO
            </span>
          </div>
        )}

        <SsoLoginOption />

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            or continue with email
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete={
                        mode === "sign-in" ? "current-password" : "new-password"
                      }
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>
              New here?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("sign-up");
                  setFormError(null);
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("sign-in");
                  setFormError(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
