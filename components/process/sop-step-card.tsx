"use client";

import { useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ImagePlus,
  Trash2,
  X,
} from "lucide-react";
import type { SopDocument } from "@/features/process/schema";
import { SOP_APPROVAL_STATUSES } from "@/features/process/templates";
import { toggleStepDependency } from "@/features/process/sop-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SopStep = SopDocument["steps"][number];

interface SopStepCardProps {
  step: SopStep;
  index: number;
  totalSteps: number;
  allSteps: SopDocument["steps"];
  readOnly: boolean;
  onChange: (step: SopStep) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const textareaClassName =
  "min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function SopStepCard({
  step,
  index,
  totalSteps,
  allSteps,
  readOnly,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: SopStepCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof SopStep>(field: K, value: SopStep[K]) {
    onChange({ ...step, [field]: value });
  }

  function handleImageUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("imageUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  const prerequisiteOptions = allSteps
    .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
    .filter(({ candidateIndex }) => candidateIndex !== index);

  return (
    <Card data-testid={`sop-step-${index}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="shrink-0">
            Step {index + 1}
          </Badge>
          <Input
            value={step.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Step title"
            className="font-medium"
            readOnly={readOnly}
            aria-label={`Step ${index + 1} title`}
          />
        </div>
        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-1 print:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Move step up"
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onMoveDown}
              disabled={index >= totalSteps - 1}
              aria-label="Move step down"
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              aria-label="Duplicate step"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Delete step"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`step-time-${index}`}>Time (minutes)</Label>
            <Input
              id={`step-time-${index}`}
              type="number"
              min={0}
              value={step.time}
              onChange={(event) => updateField("time", event.target.value)}
              placeholder="0"
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`step-approver-${index}`}>Approver</Label>
            <Input
              id={`step-approver-${index}`}
              value={step.approver}
              onChange={(event) => updateField("approver", event.target.value)}
              placeholder="e.g. Team Lead"
              readOnly={readOnly}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`step-note-${index}`}>Notes</Label>
          <textarea
            id={`step-note-${index}`}
            className={textareaClassName}
            value={step.note}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Instructions, tips, or warnings…"
            readOnly={readOnly}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`step-approval-${index}`}>Approval status</Label>
            <select
              id={`step-approval-${index}`}
              className={selectClassName}
              value={step.approvalStatus}
              onChange={(event) =>
                updateField("approvalStatus", event.target.value)
              }
              disabled={readOnly}
            >
              {SOP_APPROVAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {prerequisiteOptions.length > 0 ? (
            <div className="space-y-2">
              <Label>Prerequisites</Label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-input p-3">
                {prerequisiteOptions.map(({ candidate, candidateIndex }) => (
                  <label
                    key={candidateIndex}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={step.dependencies.includes(candidateIndex)}
                      disabled={readOnly}
                      onChange={() => {
                        const next = toggleStepDependency(
                          allSteps,
                          index,
                          candidateIndex,
                        );
                        onChange(next[index]);
                      }}
                    />
                    <span>
                      Step {candidateIndex + 1}
                      {candidate.title ? `: ${candidate.title}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Step image</Label>
          {step.imageUrl ? (
            <div className="relative inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.imageUrl}
                alt={`Step ${index + 1} illustration`}
                className="max-h-48 rounded-lg border object-contain"
              />
              {!readOnly ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 size-8"
                  onClick={() => updateField("imageUrl", "")}
                  aria-label="Remove image"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          ) : !readOnly ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  handleImageUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="mr-2 size-4" />
                Upload image
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No image</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
