"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { createRock } from "@/features/rocks/actions";
import { createRockSchema, type CreateRockInput } from "@/features/rocks/schema";
import { getCurrentQuarter } from "@/features/rocks/utils";
import type { RockMemberOption, RockTeamOption } from "@/features/rocks/types";
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

interface CreateRockDialogProps {
  organizationId: string;
  teams: RockTeamOption[];
  members: RockMemberOption[];
  defaultOwnerId: string;
  defaultQuarter?: string;
  defaultRockType?: CreateRockInput["rockType"];
}

const ROCK_TYPE_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "team", label: "Team" },
  { value: "individual", label: "Individual" },
] as const;

export function CreateRockDialog({
  organizationId,
  teams,
  members,
  defaultOwnerId,
  defaultQuarter = getCurrentQuarter(),
  defaultRockType = "team",
}: CreateRockDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState<
    Array<{ title: string; dueDate: string }>
  >([]);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  const form = useForm<CreateRockInput>({
    resolver: zodResolver(createRockSchema) as Resolver<CreateRockInput>,
    defaultValues: {
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      quarter: defaultQuarter,
      teamId: null,
      rockType: defaultRockType,
      progress: 0,
      confidence: null,
      dueDate: null,
      successDefinition: "",
    },
  });

  async function onSubmit(values: CreateRockInput) {
    setIsSubmitting(true);
    const result = await createRock({
      ...values,
      teamId: values.teamId || null,
      successDefinition: values.successDefinition || null,
      dueDate: values.dueDate || null,
      confidence: values.confidence ?? null,
      initialMilestones: draftMilestones.map((milestone) => ({
        title: milestone.title,
        dueDate: milestone.dueDate || null,
      })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create rock", result.error);
      return;
    }

    showSuccessToast("Rock created");
    form.reset({
      organizationId,
      ownerId: defaultOwnerId,
      title: "",
      quarter: defaultQuarter,
      teamId: null,
      rockType: defaultRockType,
      progress: 0,
      confidence: null,
      dueDate: null,
      successDefinition: "",
    });
    setOpen(false);
    setDraftMilestones([]);
    setMilestoneTitle("");
    setMilestoneDueDate("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-rock-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Add rock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add quarterly rock</DialogTitle>
          <DialogDescription>
            Define a 90-day priority with owner, quarter, and success criteria.
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
                    <Input placeholder="Launch new product line" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="quarter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quarter</FormLabel>
                    <FormControl>
                      <Input placeholder="2026-Q2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rockType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        value={field.value}
                        onChange={field.onChange}
                      >
                        {ROCK_TYPE_OPTIONS.map((option) => (
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
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date (optional)</FormLabel>
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

              <FormField
                control={form.control}
                name="confidence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confidence (1–10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value ? Number(event.target.value) : null,
                          )
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
              name="successDefinition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Success definition (optional)</FormLabel>
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

            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Initial milestones (optional)</p>
              {draftMilestones.map((milestone, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{milestone.title}</span>
                  {milestone.dueDate ? (
                    <span className="text-xs text-muted-foreground">{milestone.dueDate}</span>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setDraftMilestones((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Milestone title"
                  value={milestoneTitle}
                  onChange={(e) => setMilestoneTitle(e.target.value)}
                  className="max-w-xs"
                />
                <Input
                  type="date"
                  value={milestoneDueDate}
                  onChange={(e) => setMilestoneDueDate(e.target.value)}
                  className="w-36"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!milestoneTitle.trim()}
                  onClick={() => {
                    if (!milestoneTitle.trim()) return;
                    setDraftMilestones((current) => [
                      ...current,
                      { title: milestoneTitle.trim(), dueDate: milestoneDueDate },
                    ]);
                    setMilestoneTitle("");
                    setMilestoneDueDate("");
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add milestone
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting} data-testid="create-rock-submit">
                {isSubmitting ? "Creating…" : "Create rock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
