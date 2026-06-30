"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createScorecardCategory } from "@/features/scorecard/actions";
import {
  createScorecardCategorySchema,
  type CreateScorecardCategoryInput,
} from "@/features/scorecard/schema";
import type { ScorecardCategory } from "@/features/scorecard/types";
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

interface CreateCategoryDialogProps {
  organizationId: string;
  orgSlug: string;
  teamId?: string;
  teamSlug?: string;
  onCreated?: (category: ScorecardCategory) => void;
  trigger?: React.ReactNode;
}

export function CreateCategoryDialog({
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  onCreated,
  trigger,
}: CreateCategoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateScorecardCategoryInput>({
    resolver: zodResolver(
      createScorecardCategorySchema,
    ) as Resolver<CreateScorecardCategoryInput>,
    defaultValues: {
      organizationId,
      teamId: teamId ?? null,
      name: "",
      color: "#6366f1",
    },
  });

  async function onSubmit(values: CreateScorecardCategoryInput) {
    setIsSubmitting(true);
    const result = await createScorecardCategory({
      organizationId,
      teamId: teamId ?? null,
      name: values.name,
      color: values.color,
      orgSlug,
      teamSlug,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create category", result.error);
      return;
    }

    showSuccessToast("Category created");
    form.reset({
      organizationId,
      teamId: teamId ?? null,
      name: "",
      color: "#6366f1",
    });
    setOpen(false);
    onCreated?.(result.category);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
          <DialogDescription>
            Group measurables on the scorecard by category for filtering and reporting.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sales" autoFocus {...field} />
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
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-12 cursor-pointer rounded border border-input"
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        aria-label="Category color"
                      />
                      <Input {...field} className="font-mono" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
