"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createTeam } from "@/features/teams/actions";
import {
  createTeamSchema,
  teamSlugFromName,
  type CreateTeamInput,
} from "@/features/teams/schema";
import { slugifyName } from "@/features/organizations/schema";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { getTeamNavHref } from "@/components/layout/team-nav-config";

interface CreateTeamDialogProps {
  organizationId: string;
  orgSlug: string;
  trigger?: React.ReactNode;
}

export function CreateTeamDialog({
  organizationId,
  orgSlug,
  trigger,
}: CreateTeamDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema) as Resolver<CreateTeamInput>,
    defaultValues: {
      organizationId,
      name: "",
      slug: "",
    },
  });

  async function onSubmit(values: CreateTeamInput) {
    setIsSubmitting(true);
    const result = await createTeam({
      organizationId,
      name: values.name,
      slug: values.slug || teamSlugFromName(values.name),
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create team", result.error);
      return;
    }

    showSuccessToast("Team created");
    form.reset({ organizationId, name: "", slug: "" });
    setOpen(false);
    router.push(getTeamNavHref(orgSlug, result.slug, "overview"));
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Create team
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Add a team workspace for scorecards, rocks, issues, and meetings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
                        const currentSlug = form.getValues("slug");
                        if (!currentSlug || currentSlug === slugifyName(field.value)) {
                          form.setValue("slug", slugifyName(e.target.value), {
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
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL slug</FormLabel>
                  <FormControl>
                    <Input placeholder="leadership" {...field} />
                  </FormControl>
                  <FormDescription>
                    /org/{orgSlug}/teams/{field.value || "your-team"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create team"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
