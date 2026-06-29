"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createSeat } from "@/features/accountability/actions";
import {
  createSeatSchema,
  type CreateSeatInput,
} from "@/features/accountability/schema";
import type { SeatNode } from "@/features/accountability/types";
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

interface CreateSeatDialogProps {
  organizationId: string;
  seats: SeatNode[];
  defaultParentId?: string | null;
}

function flattenForSelect(
  nodes: SeatNode[],
  depth = 0,
): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      label: `${"—".repeat(depth)} ${node.title}`.trim(),
    });
    result.push(...flattenForSelect(node.children, depth + 1));
  }
  return result;
}

export function CreateSeatDialog({
  organizationId,
  seats,
  defaultParentId = null,
}: CreateSeatDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parentOptions = flattenForSelect(seats);

  const form = useForm<CreateSeatInput>({
    resolver: zodResolver(createSeatSchema) as Resolver<CreateSeatInput>,
    defaultValues: {
      organizationId,
      title: "",
      parentId: defaultParentId,
      responsibilities: "",
      displayOrder: 0,
    },
  });

  async function onSubmit(values: CreateSeatInput) {
    setIsSubmitting(true);
    const result = await createSeat({
      ...values,
      parentId: values.parentId || null,
      responsibilities: values.responsibilities || null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create seat", result.error);
      return;
    }

    showSuccessToast("Seat created");
    form.reset({
      organizationId,
      title: "",
      parentId: defaultParentId,
      responsibilities: "",
      displayOrder: 0,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-seat-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add seat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add accountability seat</DialogTitle>
          <DialogDescription>
            Define a role in your accountability chart. Seats can be nested under
            a parent seat.
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
                      {...field}
                      placeholder="e.g. Integrator"
                      data-testid="create-seat-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent seat (optional)</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.target.value || null)
                      }
                      data-testid="create-seat-parent"
                    >
                      <option value="">Top level</option>
                      {parentOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
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
              name="responsibilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsibilities (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Key responsibilities for this seat"
                      data-testid="create-seat-responsibilities"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="create-seat-submit"
              >
                {isSubmitting ? "Creating…" : "Create seat"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
