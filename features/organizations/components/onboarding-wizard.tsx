"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createOrganization } from "@/features/organizations/actions";
import { createTeam } from "@/features/teams/actions";
import {
  createOrgSchema,
  slugifyName,
  type CreateOrgInput,
} from "@/features/organizations/schema";
import { teamSlugFromName } from "@/features/teams/schema";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const teamFormSchema = z.object({
  name: z.string().trim().min(2, "Team name must be at least 2 characters"),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

type OnboardingStep = "organization" | "team";

interface OnboardingWizardProps {
  userEmail: string;
}

export function OnboardingWizard({ userEmail }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("organization");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const orgForm = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", slug: "" },
  });

  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { name: "", slug: "" },
  });

  async function handleCreateOrg(values: CreateOrgInput) {
    setError(null);
    setIsSubmitting(true);

    const result = await createOrganization(values);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOrgId(result.orgId);
    setOrgSlug(result.slug);
    setStep("team");
  }

  async function handleCreateTeam(values: TeamFormValues) {
    if (!orgId || !orgSlug) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await createTeam({
      organizationId: orgId,
      name: values.name,
      slug: values.slug || teamSlugFromName(values.name),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/org/${orgSlug}/dashboard`);
    router.refresh();
  }

  function skipTeam() {
    if (orgSlug) {
      router.push(`/org/${orgSlug}/dashboard`);
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <Badge variant="secondary" className="mx-auto w-fit">
          Step {step === "organization" ? "1" : "2"} of 2
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {step === "organization" ? "Create your organization" : "Add your first team"}
        </h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>
      </div>

      {step === "organization" ? (
        <Card>
          <CardHeader>
            <CardTitle>Organization details</CardTitle>
            <CardDescription>
              This becomes your workspace URL. You will be the owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...orgForm}>
              <form
                onSubmit={orgForm.handleSubmit(handleCreateOrg)}
                className="space-y-4"
              >
                <FormField
                  control={orgForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Inc."
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const currentSlug = orgForm.getValues("slug");
                            if (!currentSlug || currentSlug === slugifyName(field.value)) {
                              orgForm.setValue("slug", slugifyName(e.target.value), {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={orgForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL slug</FormLabel>
                      <FormControl>
                        <Input placeholder="acme-inc" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your workspace: /org/{field.value || "your-slug"}/dashboard
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Continue"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>First team (optional)</CardTitle>
            <CardDescription>
              Teams help you organize rocks, issues, and meetings. You can skip
              this and add teams later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...teamForm}>
              <form
                onSubmit={teamForm.handleSubmit(handleCreateTeam)}
                className="space-y-4"
              >
                <FormField
                  control={teamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Leadership Team"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const currentSlug = teamForm.getValues("slug");
                            if (!currentSlug || currentSlug === teamSlugFromName(field.value)) {
                              teamForm.setValue("slug", teamSlugFromName(e.target.value), {
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team slug</FormLabel>
                      <FormControl>
                        <Input placeholder="leadership" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={skipTeam}
                  >
                    Skip for now
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Creating…" : "Create team & finish"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
