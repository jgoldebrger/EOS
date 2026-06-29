"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createMetric } from "@/features/scorecard/actions";
import { createMetricSchema, type CreateMetricInput } from "@/features/scorecard/schema";
import type {
  ScorecardMemberOption,
  ScorecardTeamOption,
} from "@/features/scorecard/types";
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

interface CreateMetricDialogProps {
  organizationId: string;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  defaultOwnerId: string;
}

const TARGET_RULE_OPTIONS = [
  { value: "higher_is_better", label: "Higher is better" },
  { value: "lower_is_better", label: "Lower is better" },
  { value: "range", label: "Within range" },
  { value: "exact", label: "Exact target" },
  { value: "boolean", label: "Boolean (0/1)" },
] as const;

export function CreateMetricDialog({
  organizationId,
  teams,
  members,
  defaultOwnerId,
}: CreateMetricDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateMetricInput>({
    resolver: zodResolver(createMetricSchema) as Resolver<CreateMetricInput>,
    defaultValues: {
      organizationId,
      ownerId: defaultOwnerId,
      name: "",
      unit: "",
      description: "",
      targetRule: "higher_is_better",
      targetValue: undefined,
      targetMin: undefined,
      targetMax: undefined,
      tolerancePercent: 10,
      teamId: null,
    },
  });

  const targetRule = form.watch("targetRule");

  async function onSubmit(values: CreateMetricInput) {
    setIsSubmitting(true);
    const result = await createMetric({
      ...values,
      unit: values.unit || null,
      description: values.description || null,
      teamId: values.teamId || null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create metric", result.error);
      return;
    }

    showSuccessToast("Metric created");
    form.reset({
      organizationId,
      ownerId: defaultOwnerId,
      name: "",
      unit: "",
      description: "",
      targetRule: "higher_is_better",
      targetValue: undefined,
      targetMin: undefined,
      targetMax: undefined,
      tolerancePercent: 10,
      teamId: null,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-metric-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add metric
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add scorecard metric</DialogTitle>
          <DialogDescription>
            Define a measurable with a target rule and weekly tracking.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly revenue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="$, %, count" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tolerancePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tolerance %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetRule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target rule</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {TARGET_RULE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetRule === "range" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="targetMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {targetRule === "boolean" ? "Target (0 or 1)" : "Target value"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {targetRule === "boolean"
                        ? "Use 1 for yes/on and 0 for no/off."
                        : "Used to evaluate green, yellow, and red status."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} data-testid="create-metric-submit">
                {isSubmitting ? "Creating…" : "Create metric"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
