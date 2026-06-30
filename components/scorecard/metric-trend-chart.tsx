"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatMetricValue,
  formatPeriodLabel,
  getTimeKind,
  type PeriodType,
  type ValueType,
} from "@/features/scorecard/utils";
import type { ScorecardMetricWithOwner, ScorecardValueCell } from "@/features/scorecard/types";

interface MetricTrendChartProps {
  metric: ScorecardMetricWithOwner;
  values: ScorecardValueCell[];
  periodType?: PeriodType;
}

export function MetricTrendChart({
  metric,
  values,
  periodType = "weekly",
}: MetricTrendChartProps) {
  const valueType = (metric.value_type ?? "number") as ValueType;
  const timeKind = getTimeKind(metric);
  const target =
    metric.target_value === null || metric.target_value === undefined
      ? null
      : Number(metric.target_value);

  const data = values.map((cell) => ({
    label: formatPeriodLabel(cell.periodStart, periodType),
    actual: cell.actual,
    target,
  }));

  const hasData = data.some((point) => point.actual !== null);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No entries yet — add values in the scorecard grid.
      </div>
    );
  }

  function formatAxis(value: number) {
    return formatMetricValue(value, valueType, timeKind);
  }

  function formatTooltipValue(value: number | null | undefined) {
    if (value === null || value === undefined) {
      return "—";
    }
    return formatMetricValue(value, valueType, timeKind);
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={valueType === "time" ? 56 : 40}
            tickFormatter={formatAxis}
          />
          <Tooltip
            formatter={(value) => formatTooltipValue(value as number | null)}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
              fontSize: "12px",
            }}
          />
          {target !== null && (
            <ReferenceLine
              y={target}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: `Target ${formatMetricValue(target, valueType, timeKind)}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
