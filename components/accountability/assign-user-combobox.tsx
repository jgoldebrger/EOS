"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { SeatMemberOption } from "@/features/accountability/types";

interface AssignUserComboboxProps {
  members: SeatMemberOption[];
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function AssignUserCombobox({
  members,
  value,
  onChange,
  disabled = false,
  id,
  placeholder = "Search members…",
  className,
}: AssignUserComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = members.find((member) => member.userId === value) ?? null;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return members;
    }
    return members.filter((member) =>
      member.label.toLowerCase().includes(normalized),
    );
  }, [members, query]);

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-controls="assign-user-listbox"
        aria-expanded={open}
        aria-autocomplete="list"
        data-testid="assign-user-combobox"
        disabled={disabled}
        placeholder={selected?.label ?? placeholder}
        value={open ? query : (selected?.label ?? "")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {open && !disabled && (
        <ul
          id="assign-user-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 text-sm shadow-md"
        >
          <li role="option" aria-selected={value === null}>
            <button
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(null);
                setQuery("");
                setOpen(false);
              }}
            >
              Unassigned
            </button>
          </li>
          {filtered.map((member) => (
            <li key={member.userId} role="option" aria-selected={value === member.userId}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-muted",
                  value === member.userId && "bg-muted font-medium",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(member.userId);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {member.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-muted-foreground">No members found</li>
          )}
        </ul>
      )}
    </div>
  );
}
