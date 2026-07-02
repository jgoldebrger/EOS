"use client";

import { useState, useTransition } from "react";
import { upsertPeopleReview } from "@/features/people/actions";
import type { OrgPersonWithManager, PeopleReviewRow } from "@/features/people/queries";
import { getCurrentQuarter } from "@/features/rocks/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PeopleAnalyzerProps {
  organizationId: string;
  people: OrgPersonWithManager[];
  reviews: PeopleReviewRow[];
  canReview: boolean;
  currentUserId: string;
}

function GwcSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        className="h-9 w-full rounded-md border px-2 text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </select>
    </div>
  );
}

function PersonReviewCard({
  person,
  review,
  organizationId,
  quarter,
  canReview,
  isPending,
  onSaved,
}: {
  person: OrgPersonWithManager;
  review?: PeopleReviewRow;
  organizationId: string;
  quarter: string;
  canReview: boolean;
  isPending: boolean;
  onSaved: (review: PeopleReviewRow) => void;
}) {
  const [getIt, setGetIt] = useState(review?.getIt ?? 3);
  const [wantIt, setWantIt] = useState(review?.wantIt ?? 3);
  const [capacity, setCapacity] = useState(review?.capacity ?? 3);
  const [, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await upsertPeopleReview({
        organizationId,
        subjectUserId: person.userId,
        getIt,
        wantIt,
        capacity,
        quarter,
      });

      if (!result.success) {
        showErrorToast("Could not save review", result.error);
        return;
      }

      showSuccessToast("GWC review saved");
      onSaved({
        id: review?.id ?? crypto.randomUUID(),
        subjectUserId: person.userId,
        reviewerUserId: review?.reviewerUserId ?? "",
        getIt,
        wantIt,
        capacity,
        notes: review?.notes ?? "",
        quarter,
        subjectName: person.displayName,
        reviewerName: review?.reviewerName ?? "You",
      });
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{person.displayName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-4">
        <GwcSelect
          label="Get it"
          value={getIt}
          onChange={setGetIt}
          disabled={!canReview || isPending}
        />
        <GwcSelect
          label="Want it"
          value={wantIt}
          onChange={setWantIt}
          disabled={!canReview || isPending}
        />
        <GwcSelect
          label="Capacity"
          value={capacity}
          onChange={setCapacity}
          disabled={!canReview || isPending}
        />
        {canReview ? (
          <div className="flex items-end">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PeopleAnalyzer({
  organizationId,
  people,
  reviews: initialReviews,
  canReview,
  currentUserId,
}: PeopleAnalyzerProps) {
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [reviews, setReviews] = useState(initialReviews);
  const [isPending] = useTransition();

  function getReviewFor(subjectUserId: string) {
    return reviews.find(
      (review) =>
        review.subjectUserId === subjectUserId && review.reviewerUserId === currentUserId,
    );
  }

  return (
    <div className="space-y-6" data-testid="people-analyzer">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="gwc-quarter" className="text-xs font-medium text-muted-foreground">
            Quarter
          </label>
          <Input
            id="gwc-quarter"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="w-32"
          />
        </div>
      </div>

      <div className="space-y-4">
        {people.map((person) => (
          <PersonReviewCard
            key={person.userId}
            person={person}
            review={getReviewFor(person.userId)}
            organizationId={organizationId}
            quarter={quarter}
            canReview={canReview}
            isPending={isPending}
            onSaved={(saved) =>
              setReviews((current) => {
                const index = current.findIndex(
                  (review) =>
                    review.subjectUserId === saved.subjectUserId &&
                    review.reviewerUserId === currentUserId &&
                    review.quarter === quarter,
                );
                if (index >= 0) {
                  const next = [...current];
                  next[index] = { ...saved, reviewerUserId: currentUserId };
                  return next;
                }
                return [...current, { ...saved, reviewerUserId: currentUserId }];
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
