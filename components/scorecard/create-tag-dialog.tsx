"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createTag } from "@/features/scorecard/actions";
import { createTagSchema, type CreateTagInput } from "@/features/scorecard/schema";
import type { ScorecardTag } from "@/features/scorecard/types";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface CreateTagDialogProps {
  organizationId: string;
  orgSlug: string;
  teamId?: string;
  teamSlug?: string;
  onCreated?: (tag: ScorecardTag) => void;
  trigger?: React.ReactNode;
}

export function CreateTagDialog({
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  onCreated,
  trigger,
}: CreateTagDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema) as Resolver<CreateTagInput>,
    defaultValues: {
      organizationId,
      teamId: teamId ?? null,
      name: "",
      color: "#6366f1",
    },
  });

  async function onSubmit(values: CreateTagInput) {
    setIsSubmitting(true);
    const result = await createTag({
      organizationId,
      teamId: teamId ?? null,
      name: values.name,
      color: values.color,
      orgSlug,
      teamSlug,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create tag", result.error);
      return;
    }

    showSuccessToast("Tag created");
    form.reset({
      organizationId,
      teamId: teamId ?? null,
      name: "",
      color: "#6366f1",
    });
    setOpen(false);
    onCreated?.(result.tag);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add tag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tag</DialogTitle>
          <DialogDescription>
            Label measurables with tags for quick scanning and organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag name</FormLabel>
                  <FormControl>
                    <Input placeholder="Priority" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color (optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 cursor-pointer rounded border border-input"
                        value={field.value ?? "#6366f1"}
                        onChange={(event) => field.onChange(event.target.value)}
                        aria-label="Tag color"
                      />
                      <Input {...field} value={field.value ?? ""} className="font-mono" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create tag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
