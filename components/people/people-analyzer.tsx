"use client";

import { useMemo, useState, useTransition } from "react";
import { upsertPeopleReview } from "@/features/people/actions";
import type { OrgPersonWithManager, PeopleReviewRow } from "@/features/people/queries";
import type { CoreValueRating, RprsStatus } from "@/features/people/utils";
import {
  computeRprsStatus,
  isRightPerson,
  isRightSeat,
  RPRS_STATUS_LABELS,
} from "@/features/people/utils";
import { getCurrentQuarter } from "@/features/rocks/utils";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { PeopleAnalyzerGrid } from "@/components/people/people-analyzer-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SeatOption {
  id: string;
  title: string;
  assignedUserId: string | null;
}

interface PeopleAnalyzerProps {
  organizationId: string;
  people: OrgPersonWithManager[];
  reviews: PeopleReviewRow[];
  coreValues: string[];
  seats: SeatOption[];
  canReview: boolean;
  currentUserId: string;
  defaultQuarter?: string;
}

const selectClassName =
  "h-9 w-full rounded-md border px-2 text-sm bg-transparent";

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
        className={selectClassName}
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

function RprsBadge({ status }: { status: RprsStatus }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "capitalize",
        status === "green" && "bg-emerald-100 text-emerald-800",
        status === "yellow" && "bg-amber-100 text-amber-800",
        status === "red" && "bg-red-100 text-red-800",
      )}
    >
      {RPRS_STATUS_LABELS[status]}
    </Badge>
  );
}

function PersonReviewCard({
  person,
  review,
  organizationId,
  quarter,
  coreValues,
  seats,
  canReview,
  isPending,
  onSaved,
}: {
  person: OrgPersonWithManager;
  review?: PeopleReviewRow;
  organizationId: string;
  quarter: string;
  coreValues: string[];
  seats: SeatOption[];
  canReview: boolean;
  isPending: boolean;
  onSaved: (review: PeopleReviewRow) => void;
}) {
  const defaultSeat =
    seats.find((seat) => seat.assignedUserId === person.userId)?.id ??
    review?.seatId ??
    "";

  const [seatId, setSeatId] = useState(defaultSeat || "");
  const [getIt, setGetIt] = useState(review?.getIt ?? 3);
  const [wantIt, setWantIt] = useState(review?.wantIt ?? 3);
  const [capacity, setCapacity] = useState(review?.capacity ?? 3);
  const [notes, setNotes] = useState(review?.notes ?? "");
  const [coreValuesScores, setCoreValuesScores] = useState<
    Record<string, CoreValueRating>
  >(() => {
    const initial: Record<string, CoreValueRating> = {};
    for (const value of coreValues) {
      initial[value] = review?.coreValuesScores[value] ?? "+/-";
    }
    return initial;
  });
  const [, startTransition] = useTransition();

  const rprsStatus = computeRprsStatus({
    getIt,
    wantIt,
    capacity,
    coreValueNames: coreValues,
    coreValuesScores,
  });

  function handleSave() {
    startTransition(async () => {
      const result = await upsertPeopleReview({
        organizationId,
        subjectUserId: person.userId,
        seatId: seatId || null,
        getIt,
        wantIt,
        capacity,
        coreValuesScores,
        notes,
        quarter,
      });

      if (!result.success) {
        showErrorToast("Could not save review", result.error);
        return;
      }

      showSuccessToast("People Analyzer review saved");
      const seatTitle = seats.find((seat) => seat.id === seatId)?.title ?? null;
      onSaved({
        id: review?.id ?? crypto.randomUUID(),
        subjectUserId: person.userId,
        reviewerUserId: review?.reviewerUserId ?? "",
        seatId: seatId || null,
        seatTitle,
        getIt,
        wantIt,
        capacity,
        coreValuesScores,
        notes,
        quarter,
        subjectName: person.displayName,
        reviewerName: review?.reviewerName ?? "You",
      });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{person.displayName}</CardTitle>
          {person.seatTitle ? (
            <p className="text-xs text-muted-foreground">Seat: {person.seatTitle}</p>
          ) : null}
        </div>
        <RprsBadge status={rprsStatus} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Right Seat</label>
          <select
            className={selectClassName}
            value={seatId}
            onChange={(e) => setSeatId(e.target.value)}
            disabled={!canReview || isPending}
          >
            <option value="">No seat linked</option>
            {seats.map((seat) => (
              <option key={seat.id} value={seat.id}>
                {seat.title}
              </option>
            ))}
          </select>
        </div>

        {coreValues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Right Person — Core Values</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {coreValues.map((value) => (
                <div key={value} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="text-sm">{value}</span>
                  <select
                    className="h-8 rounded-md border px-2 text-sm"
                    value={coreValuesScores[value] ?? "+/-"}
                    onChange={(e) =>
                      setCoreValuesScores((current) => ({
                        ...current,
                        [value]: e.target.value as CoreValueRating,
                      }))
                    }
                    disabled={!canReview || isPending}
                  >
                    <option value="+">+</option>
                    <option value="+/-">+/-</option>
                    <option value="-">-</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add core values in V/TO to enable Right Person ratings.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
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
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Notes</label>
          <textarea
            className="min-h-[72px] w-full rounded-md border px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canReview || isPending}
            placeholder="Quarterly review notes…"
          />
        </div>

        {canReview ? (
          <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
            Save review
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RprsMatrix({
  people,
  reviews,
  coreValues,
  currentUserId,
  quarter,
}: {
  people: OrgPersonWithManager[];
  reviews: PeopleReviewRow[];
  coreValues: string[];
  currentUserId: string;
  quarter: string;
}) {
  const matrix = useMemo(() => {
    return people.map((person) => {
      const review = reviews.find(
        (row) =>
          row.subjectUserId === person.userId &&
          row.reviewerUserId === currentUserId &&
          row.quarter === quarter,
      );
      if (!review) {
        return { person, status: "red" as RprsStatus, review: null };
      }
      return {
        person,
        review,
        status: computeRprsStatus({
          getIt: review.getIt,
          wantIt: review.wantIt,
          capacity: review.capacity,
          coreValueNames: coreValues,
          coreValuesScores: review.coreValuesScores,
        }),
      };
    });
  }, [people, reviews, coreValues, currentUserId, quarter]);

  return (
    <div className="overflow-x-auto rounded-lg border" data-testid="rprs-matrix">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-4 py-3 font-medium">Person</th>
            <th className="px-4 py-3 font-medium">Seat</th>
            <th className="px-4 py-3 font-medium">Right Person</th>
            <th className="px-4 py-3 font-medium">Right Seat (GWC)</th>
            <th className="px-4 py-3 font-medium">RPRS</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map(({ person, review, status }) => (
            <tr key={person.userId} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{person.displayName}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {review?.seatTitle ?? person.seatTitle ?? "—"}
              </td>
              <td className="px-4 py-3">
                {review
                  ? isRightPerson(coreValues, review.coreValuesScores)
                    ? "Yes"
                    : "No"
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {review
                  ? isRightSeat(review.getIt, review.wantIt, review.capacity)
                    ? "Yes"
                    : "No"
                  : "—"}
              </td>
              <td className="px-4 py-3">
                <RprsBadge status={status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PeopleAnalyzer({
  organizationId,
  people,
  reviews: initialReviews,
  coreValues,
  seats,
  canReview,
  currentUserId,
  defaultQuarter,
}: PeopleAnalyzerProps) {
  const [quarter, setQuarter] = useState(defaultQuarter ?? getCurrentQuarter());
  const [reviews, setReviews] = useState(initialReviews);
  const [view, setView] = useState<"review" | "matrix" | "grid">("review");
  const [isPending] = useTransition();

  function getReviewFor(subjectUserId: string) {
    return reviews.find(
      (review) =>
        review.subjectUserId === subjectUserId &&
        review.reviewerUserId === currentUserId &&
        review.quarter === quarter,
    );
  }

  return (
    <div className="space-y-6" data-testid="people-analyzer">
      <div className="flex flex-wrap items-end justify-between gap-3">
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
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "review" ? "default" : "outline"}
            onClick={() => setView("review")}
          >
            Reviews
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "matrix" ? "default" : "outline"}
            onClick={() => setView("matrix")}
          >
            RPRS matrix
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "grid" ? "default" : "outline"}
            onClick={() => setView("grid")}
          >
            Analyzer grid
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <PeopleAnalyzerGrid
          people={people}
          reviews={reviews}
          coreValues={coreValues}
          seats={seats}
          currentUserId={currentUserId}
          quarter={quarter}
        />
      ) : view === "matrix" ? (
        <RprsMatrix
          people={people}
          reviews={reviews}
          coreValues={coreValues}
          currentUserId={currentUserId}
          quarter={quarter}
        />
      ) : (
        <div className="space-y-4">
          {people.map((person) => (
            <PersonReviewCard
              key={person.userId}
              person={person}
              review={getReviewFor(person.userId)}
              organizationId={organizationId}
              quarter={quarter}
              coreValues={coreValues}
              seats={seats}
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
      )}
    </div>
  );
}
