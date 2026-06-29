"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createTodo } from "@/features/todos/actions";
import { createTodoSchema, type CreateTodoInput } from "@/features/todos/schema";
import type { TodoMemberOption, TodoTeamOption } from "@/features/todos/types";
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

interface CreateTodoDialogProps {
  organizationId: string;
  teams: TodoTeamOption[];
  members: TodoMemberOption[];
  defaultOwnerId: string;
}

export function CreateTodoDialog({
  organizationId,
  teams,
  members,
  defaultOwnerId,
}: CreateTodoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTodoInput>({
    resolver: zodResolver(createTodoSchema) as Resolver<CreateTodoInput>,
    defaultValues: {
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      teamId: null,
      dueDate: null,
      sourceType: "manual",
    },
  });

  async function onSubmit(values: CreateTodoInput) {
    setIsSubmitting(true);
    const result = await createTodo({
      ...values,
      teamId: values.teamId || null,
      dueDate: values.dueDate || null,
      sourceType: "manual",
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create todo", result.error);
      return;
    }

    showSuccessToast("Todo created");
    form.reset({
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      teamId: null,
      dueDate: null,
      sourceType: "manual",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-todo-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add todo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add accountable todo</DialogTitle>
          <DialogDescription>
            Capture a 7-day action with a clear owner and due date.
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
                    <Input placeholder="Follow up with vendor" {...field} />
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
                        value={field.value}
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value || null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="create-todo-submit"
              >
                {isSubmitting ? "Creating…" : "Create todo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
