"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createIssue } from "@/features/issues/actions";
import { createIssueSchema, type CreateIssueInput } from "@/features/issues/schema";
import type { IssueMemberOption, IssueTeamOption } from "@/features/issues/types";
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

interface CreateIssueDialogProps {
  organizationId: string;
  teams: IssueTeamOption[];
  members: IssueMemberOption[];
  defaultOwnerId: string;
  defaultTeamId?: string;
  linkedMeetingId?: string;
  triggerLabel?: string;
}

export function CreateIssueDialog({
  organizationId,
  teams,
  members,
  defaultOwnerId,
  defaultTeamId,
  linkedMeetingId,
  triggerLabel = "Add issue",
}: CreateIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema) as Resolver<CreateIssueInput>,
    defaultValues: {
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      description: "",
      teamId: defaultTeamId ?? null,
      linkedMeetingId: linkedMeetingId ?? null,
      priority: 0,
      status: "open",
    },
  });

  async function onSubmit(values: CreateIssueInput) {
    setIsSubmitting(true);
    const result = await createIssue({
      ...values,
      teamId: values.teamId || defaultTeamId || null,
      description: values.description || null,
      ownerId: values.ownerId || defaultOwnerId,
      linkedMeetingId: values.linkedMeetingId ?? linkedMeetingId ?? null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create issue", result.error);
      return;
    }

    showSuccessToast("Issue captured");
    form.reset({
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      description: "",
      teamId: defaultTeamId ?? null,
      linkedMeetingId: linkedMeetingId ?? null,
      priority: 0,
      status: "open",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-issue-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture issue</DialogTitle>
          <DialogDescription>
            Fast capture for the Issues List. Prioritize and work through IDS later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What needs attention?"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      placeholder="Additional context…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        value={field.value ?? defaultOwnerId}
                        onChange={field.onChange}
                      >
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team (optional)</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value || null)
                        }
                      >
                        <option value="">Organization-wide</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="create-issue-submit"
              >
                {isSubmitting ? "Saving…" : "Capture issue"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
