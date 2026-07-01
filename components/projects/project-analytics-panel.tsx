"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectAnalytics } from "@/features/projects/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectAnalyticsPanelProps {
  analytics: ProjectAnalytics;
}

export function ProjectAnalyticsPanel({ analytics }: ProjectAnalyticsPanelProps) {
  const { burndown, velocity, workload, cycleProgress } = analytics;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cycle progress</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {cycleProgress.cycleName ? (
            <p>
              <span className="font-medium text-foreground">
                {cycleProgress.cycleName}
              </span>
              : {cycleProgress.completed} of {cycleProgress.total} work items
              completed
            </p>
          ) : (
            <p>No active cycle. Set a cycle as current to track progress.</p>
          )}
        </CardContent>
      </Card>

      {burndown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Burndown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke="hsl(var(--primary))"
                  name="Remaining"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--muted-foreground))"
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {velocity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Velocity by cycle</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cycleName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {workload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open workload by assignee</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="assigneeLabel"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Open items" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
