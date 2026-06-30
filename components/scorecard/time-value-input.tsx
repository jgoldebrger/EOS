"use client";

import { useEffect, useState } from "react";
import {
  clockTimeToInput,
  minutesToTimeInput,
  parseClockTimeInput,
  parseDurationTimeInput,
  type TimeKind,
} from "@/features/scorecard/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimeValueInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | null | undefined;
  onChange: (minutes: number | null) => void;
  onInvalid?: () => void;
  timeKind?: TimeKind;
}

export function TimeValueInput({
  value,
  onChange,
  onInvalid,
  timeKind = "duration",
  className,
  ...props
}: TimeValueInputProps) {
  const toInput = timeKind === "clock" ? clockTimeToInput : minutesToTimeInput;
  const parseInput = timeKind === "clock" ? parseClockTimeInput : parseDurationTimeInput;

  const [draft, setDraft] = useState(() => toInput(value));

  useEffect(() => {
    setDraft(toInput(value));
  }, [value, timeKind]);

  function commitDraft(nextDraft: string = draft) {
    const trimmed = nextDraft.trim();

    if (trimmed === "") {
      onChange(null);
      return;
    }

    const parsed = parseInput(trimmed);
    if (parsed === null || Number.isNaN(parsed)) {
      onInvalid?.();
      setDraft(toInput(value));
      return;
    }

    onChange(parsed);
    setDraft(toInput(parsed));
  }

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft);

    const trimmed = nextDraft.trim();
    if (trimmed === "") {
      return;
    }

    const parsed = parseInput(trimmed);
    if (parsed !== null && !Number.isNaN(parsed)) {
      onChange(parsed);
    }
  }

  return (
    <Input
      type="text"
      inputMode="text"
      placeholder={timeKind === "clock" ? "2:00 PM" : "0:00"}
      autoComplete="off"
      className={cn("tabular-nums", className)}
      value={draft}
      onChange={(event) => handleDraftChange(event.target.value)}
      onBlur={() => commitDraft()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      {...props}
    />
  );
}
