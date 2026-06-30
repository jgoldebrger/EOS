"use client";

import { Badge } from "@/components/ui/badge";
import { CreateTagDialog } from "@/components/scorecard/create-tag-dialog";
import type { ScorecardTag } from "@/features/scorecard/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TagPickerProps {
  organizationId: string;
  orgSlug: string;
  teamId?: string;
  teamSlug?: string;
  tags: ScorecardTag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onTagsChange?: (tags: ScorecardTag[]) => void;
  disabled?: boolean;
  className?: string;
}

export function TagBadges({ tags, className }: { tags: ScorecardTag[]; className?: string }) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs font-normal"
          style={
            tag.color
              ? {
                  backgroundColor: `${tag.color}22`,
                  borderColor: `${tag.color}55`,
                  color: tag.color,
                }
              : undefined
          }
        >
          {tag.name}
        </Badge>
      ))}
    </span>
  );
}

export function TagPicker({
  organizationId,
  orgSlug,
  teamId,
  teamSlug,
  tags,
  selectedTagIds,
  onChange,
  onTagsChange,
  disabled = false,
  className,
}: TagPickerProps) {
  function toggleTag(tagId: string) {
    if (disabled) {
      return;
    }
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }
    onChange([...selectedTagIds, tagId]);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                  disabled && "cursor-not-allowed opacity-60",
                )}
                style={
                  selected && tag.color
                    ? {
                        backgroundColor: `${tag.color}22`,
                        borderColor: tag.color,
                        color: tag.color,
                      }
                    : undefined
                }
              >
                {tag.name}
              </button>
            );
          })
        )}
      </div>
      {!disabled ? (
        <CreateTagDialog
          organizationId={organizationId}
          orgSlug={orgSlug}
          teamId={teamId}
          teamSlug={teamSlug}
          onCreated={(tag) => {
            onTagsChange?.([...tags, tag]);
            onChange([...selectedTagIds, tag.id]);
          }}
          trigger={
            <Button type="button" variant="outline" size="sm">
              Add tag
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
