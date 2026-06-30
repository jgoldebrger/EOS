"use client";

import { cn } from "@/lib/utils";

interface FormulaHelpCheatSheetProps {
  className?: string;
}

export function FormulaHelpCheatSheet({ className }: FormulaHelpCheatSheetProps) {
  return (
    <details className={cn("rounded-md border border-dashed px-3 py-2 text-sm", className)}>
      <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
        Formula reference
      </summary>
      <div className="mt-3 space-y-3 text-muted-foreground">
        <section>
          <p className="font-medium text-foreground">Measurables</p>
          <p>Search and insert tokens, or paste: {"{{metric:orgId:metricId}}"}</p>
        </section>
        <section>
          <p className="font-medium text-foreground">Operators</p>
          <p>+ − * / ( ) &nbsp;·&nbsp; comparisons: &gt; &lt; &gt;= &lt;= =</p>
        </section>
        <section>
          <p className="font-medium text-foreground">Functions</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              <code className="text-foreground">SUM(a, b, …)</code> — add values
            </li>
            <li>
              <code className="text-foreground">AVG(a, b, …)</code> — average
            </li>
            <li>
              <code className="text-foreground">MIN(a, b, …)</code> /{" "}
              <code className="text-foreground">MAX(a, b, …)</code>
            </li>
            <li>
              <code className="text-foreground">IF(cond, then, else)</code> — e.g.{" "}
              <code className="text-foreground">IF(m1 &gt;= 10, m2, 0)</code>
            </li>
            <li>
              <code className="text-foreground">ROUND(value, decimals?)</code> — e.g.{" "}
              <code className="text-foreground">ROUND(m1 / m2, 2)</code>
            </li>
            <li>
              <code className="text-foreground">ABS(value)</code> — absolute value
            </li>
            <li>
              <code className="text-foreground">COUNT(a, b, …)</code> — count non-null
              arguments
            </li>
          </ul>
        </section>
        <p className="text-xs">
          Weekly formula measurables are computed once per week. Daily formula measurables
          are computed per day and rolled up on the weekly scorecard using the weekly rollup
          method. Daily-entry sources referenced in any formula are rolled up automatically.
        </p>
      </div>
    </details>
  );
}
