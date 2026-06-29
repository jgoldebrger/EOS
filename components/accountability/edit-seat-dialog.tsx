"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { updateSeat } from "@/features/accountability/actions";
import {
  updateSeatSchema,
  type UpdateSeatInput,
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

interface EditSeatDialogProps {
  organizationId: string;
  seat: SeatNode | null;
  seats: SeatNode[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function flattenForSelect(
  nodes: SeatNode[],
  excludeId: string,
  depth = 0,
): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const node of nodes) {
    if (node.id !== excludeId) {
      result.push({
        id: node.id,
        label: `${"—".repeat(depth)} ${node.title}`.trim(),
      });
      result.push(...flattenForSelect(node.children, excludeId, depth + 1));
    }
  }
  return result;
}

export function EditSeatDialog({
  organizationId,
  seat,
  seats,
  open,
  onOpenChange,
}: EditSeatDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parentOptions = seat ? flattenForSelect(seats, seat.id) : [];

  const form = useForm<UpdateSeatInput>({
    resolver: zodResolver(updateSeatSchema) as Resolver<UpdateSeatInput>,
    defaultValues: {
      organizationId,
      seatId: seat?.id ?? "",
      title: seat?.title ?? "",
      parentId: seat?.parent_id ?? null,
      responsibilities: seat?.responsibilities ?? "",
    },
  });

  useEffect(() => {
    if (seat) {
      form.reset({
        organizationId,
        seatId: seat.id,
        title: seat.title,
        parentId: seat.parent_id,
        responsibilities: seat.responsibilities ?? "",
      });
    }
  }, [seat, organizationId, form]);

  async function onSubmit(values: UpdateSeatInput) {
    if (!seat) return;

    setIsSubmitting(true);
    const result = await updateSeat({
      ...values,
      responsibilities: values.responsibilities || null,
      parentId: values.parentId ?? null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not update seat", result.error);
      return;
    }

    showSuccessToast("Seat updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit seat</DialogTitle>
          <DialogDescription>
            Update the title, parent, or responsibilities for this seat.
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
                    <Input {...field} data-testid="edit-seat-title" />
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
                  <FormLabel>Parent seat</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.target.value || null)
                      }
                      data-testid="edit-seat-parent"
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
                  <FormLabel>Responsibilities</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid="edit-seat-responsibilities"
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
                data-testid="edit-seat-submit"
              >
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
