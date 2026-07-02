"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReportsQuarterFilterProps {
  orgSlug: string;
  quarter: string;
}

export function ReportsQuarterFilter({ orgSlug, quarter }: ReportsQuarterFilterProps) {
  const router = useRouter();

  return (
    <div className="flex max-w-xs flex-col gap-1">
      <Label htmlFor="reports-quarter">Quarter</Label>
      <Input
        id="reports-quarter"
        defaultValue={quarter}
        placeholder="2026-Q2"
        onBlur={(event) => {
          const value = event.target.value.trim();
          if (!value || value === quarter) return;
          router.push(`/org/${orgSlug}/reports?quarter=${encodeURIComponent(value)}`);
        }}
      />
    </div>
  );
}
