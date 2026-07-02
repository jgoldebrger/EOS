"use client";

import { useMemo } from "react";
import type { OrgPersonWithManager, PeopleReviewRow } from "@/features/people/queries";
import {
  computeRprsStatus,
  isRightPerson,
  isRightSeat,
  RPRS_STATUS_LABELS,
} from "@/features/people/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SeatOption {
  id: string;
  title: string;
  assignedUserId: string | null;
}

interface PeopleAnalyzerGridProps {
  people: OrgPersonWithManager[];
  reviews: PeopleReviewRow[];
  coreValues: string[];
  seats: SeatOption[];
  currentUserId: string;
  quarter: string;
}

function RprsBadge({ status }: { status: ReturnType<typeof computeRprsStatus> }) {
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

export function PeopleAnalyzerGrid({
  people,
  reviews,
  coreValues,
  seats,
  currentUserId,
  quarter,
}: PeopleAnalyzerGridProps) {
  const rows = useMemo(() => {
    return people.map((person) => {
      const review = reviews.find(
        (row) =>
          row.subjectUserId === person.userId &&
          row.reviewerUserId === currentUserId &&
          row.quarter === quarter,
      );

      const seatTitle =
        review?.seatTitle ??
        person.seatTitle ??
        seats.find((seat) => seat.assignedUserId === person.userId)?.title ??
        "—";

      const status = review
        ? computeRprsStatus({
            getIt: review.getIt,
            wantIt: review.wantIt,
            capacity: review.capacity,
            coreValueNames: coreValues,
            coreValuesScores: review.coreValuesScores,
          })
        : ("red" as const);

      return {
        person,
        review,
        seatTitle,
        status,
      };
    });
  }, [people, reviews, seats, coreValues, currentUserId, quarter]);

  return (
    <div className="overflow-x-auto rounded-lg border" data-testid="people-analyzer-grid">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className="px-3 py-2 font-medium">Person</th>
            <th className="px-3 py-2 font-medium">Seat</th>
            <th className="px-3 py-2 font-medium">Get it</th>
            <th className="px-3 py-2 font-medium">Want it</th>
            <th className="px-3 py-2 font-medium">Capacity</th>
            {coreValues.map((value) => (
              <th key={value} className="px-3 py-2 font-medium">
                {value}
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Right Person</th>
            <th className="px-3 py-2 font-medium">Right Seat</th>
            <th className="px-3 py-2 font-medium">RPRS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ person, review, seatTitle, status }) => (
            <tr key={person.userId} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{person.displayName}</td>
              <td className="px-3 py-2 text-muted-foreground">{seatTitle}</td>
              <td className="px-3 py-2 tabular-nums">{review?.getIt ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{review?.wantIt ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{review?.capacity ?? "—"}</td>
              {coreValues.map((value) => (
                <td key={value} className="px-3 py-2 tabular-nums">
                  {review?.coreValuesScores[value] ?? "—"}
                </td>
              ))}
              <td className="px-3 py-2">
                {review
                  ? isRightPerson(coreValues, review.coreValuesScores)
                    ? "Yes"
                    : "No"
                  : "—"}
              </td>
              <td className="px-3 py-2">
                {review
                  ? isRightSeat(review.getIt, review.wantIt, review.capacity)
                    ? "Yes"
                    : "No"
                  : "—"}
              </td>
              <td className="px-3 py-2">
                <RprsBadge status={status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
