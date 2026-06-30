"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  previewFormula,
  resolveFormulaMetricLabels,
  searchFormulaMetrics,
  type FormulaBrokenRef,
  type FormulaMetricSearchResult,
} from "@/features/scorecard/actions";
import {
  buildLabelToTokenMap,
  formatFormulaForDisplay,
  metricRefKey,
  parseFormulaFromDisplay,
  parseMetricRefsFromFormula,
  wrapFormulaDisplayLabel,
  type FormulaMetricToken,
} from "@/features/scorecard/formula";
import {
  formatMetricValue,
  formatWeekLabel,
  getTimeKind,
  type TimeKind,
  type ValueType,
} from "@/features/scorecard/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FormulaMetricInputProps {
  organizationId: string;
  teamId?: string | null;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  valueType?: ValueType;
  timeKind?: TimeKind;
  formulaTokens?: FormulaMetricToken[] | null;
}

function mergeLabelMaps(
  ...maps: Array<Map<string, string>>
): Map<string, string> {
  const merged = new Map<string, string>();
  for (const map of maps) {
    for (const [label, token] of map) {
      merged.set(label, token);
    }
  }
  return merged;
}

function tokensFromLabelMap(labelToToken: Map<string, string>): FormulaMetricToken[] {
  const tokens: FormulaMetricToken[] = [];

  for (const [label, token] of labelToToken) {
    const match = token.match(
      /^\{\{metric:([0-9a-f-]{36}):([0-9a-f-]{36})\}\}$/i,
    );
    if (!match) {
      continue;
    }

    tokens.push({
      type: "metric",
      organizationId: match[1]!,
      metricId: match[2]!,
      label,
    });
  }

  return tokens;
}

export function FormulaMetricInput({
  organizationId,
  teamId,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = "Use + - * / ( ), SUM, AVG, MIN, MAX, IF, ROUND, ABS, COUNT, and measurable references",
  className,
  valueType = "number",
  timeKind,
  formulaTokens,
}: FormulaMetricInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FormulaMetricSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [previewValue, setPreviewValue] = useState<number | null | undefined>(undefined);
  const [previewPeriod, setPreviewPeriod] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [brokenRefs, setBrokenRefs] = useState<FormulaBrokenRef[]>([]);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const resolvedRefsRef = useRef(new Set<string>());
  const [labelToToken, setLabelToToken] = useState(() =>
    buildLabelToTokenMap(formulaTokens),
  );
  const [displayValue, setDisplayValue] = useState(() =>
    formatFormulaForDisplay(value, formulaTokens),
  );
  const resolvedTimeKind = timeKind ?? getTimeKind({ value_type: valueType, time_kind: null });

  const syncDisplayFromCanonical = useCallback(
    (canonical: string, labels: Map<string, string>) => {
      setDisplayValue(
        formatFormulaForDisplay(canonical, tokensFromLabelMap(labels)),
      );
    },
    [],
  );

  useEffect(() => {
    setLabelToToken((current) =>
      mergeLabelMaps(buildLabelToTokenMap(formulaTokens), current),
    );
  }, [formulaTokens]);

  useEffect(() => {
    if (isFocusedRef.current) {
      return;
    }
    syncDisplayFromCanonical(value, labelToToken);
  }, [value, labelToToken, syncDisplayFromCanonical]);

  useEffect(() => {
    const refs = parseMetricRefsFromFormula(value);
    const missing = refs.filter((ref) => {
      const key = metricRefKey(ref.organizationId, ref.metricId);
      if (resolvedRefsRef.current.has(key)) {
        return false;
      }
      return ![...labelToToken.values()].some((token) => token.includes(ref.metricId));
    });

    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    void resolveFormulaMetricLabels({ organizationId, refs: missing }).then(
      (resolved) => {
        if (cancelled || resolved.length === 0) {
          return;
        }

        for (const ref of missing) {
          resolvedRefsRef.current.add(
            metricRefKey(ref.organizationId, ref.metricId),
          );
        }

        setLabelToToken((current) =>
          mergeLabelMaps(current, buildLabelToTokenMap(resolved)),
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [organizationId, value, labelToToken]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const matches = await searchFormulaMetrics({
          organizationId,
          teamId,
          query,
          includeOtherOrgs: true,
        });
        setResults(matches);
      });
    }, 200);

    return () => window.clearTimeout(handle);
  }, [organizationId, teamId, open, query]);

  useEffect(() => {
    if (!value.trim()) {
      setPreviewValue(undefined);
      setPreviewPeriod(null);
      setPreviewError(null);
      setBrokenRefs([]);
      return;
    }

    const handle = window.setTimeout(() => {
      startPreviewTransition(async () => {
        const result = await previewFormula({ organizationId, formula: value });
        setBrokenRefs(result.brokenRefs);
        if (result.success) {
          setPreviewValue(result.value);
          setPreviewPeriod(result.periodStart);
          setPreviewError(null);
        } else {
          setPreviewValue(undefined);
          setPreviewPeriod(null);
          setPreviewError(result.error || null);
        }
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [organizationId, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleDisplayChange(nextDisplay: string) {
    setDisplayValue(nextDisplay);
    onChange(parseFormulaFromDisplay(nextDisplay, labelToToken));
  }

  function insertMetric(result: FormulaMetricSearchResult) {
    const nextLabelMap = new Map(labelToToken);
    nextLabelMap.set(result.label, result.token);
    setLabelToToken(nextLabelMap);

    const displayLabel = wrapFormulaDisplayLabel(result.label);
    const nextDisplay = displayValue.trim()
      ? `${displayValue.trim()} ${displayLabel}`
      : displayLabel;

    setDisplayValue(nextDisplay);
    onChange(parseFormulaFromDisplay(nextDisplay, nextLabelMap));
    setQuery("");
    setOpen(false);
  }

  const formattedPreview =
    previewValue === undefined || previewValue === null
      ? previewValue === null
        ? "—"
        : null
      : formatMetricValue(previewValue, valueType, resolvedTimeKind);

  const suggestedResults = results.filter(
    (result) => result.suggested || result.sameTeam || result.directReport,
  );
  const otherResults = results.filter(
    (result) => !result.suggested && !result.sameTeam && !result.directReport,
  );

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      <textarea
        className={cn(
          "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-60",
        )}
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => handleDisplayChange(event.target.value)}
        onFocus={() => {
          isFocusedRef.current = true;
          setOpen(true);
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          onBlur?.();
        }}
      />
      {brokenRefs.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {brokenRefs.map((ref) => (
            <Badge
              key={`${ref.organizationId}:${ref.metricId}`}
              variant="outline"
              className="border-amber-500/50 text-amber-700 dark:text-amber-400"
            >
              {ref.reason === "archived"
                ? `Archived: ${ref.name ?? "measurable"}`
                : "Missing measurable reference"}
            </Badge>
          ))}
        </div>
      ) : null}
      {value.trim() ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-sm">
          {isPreviewPending ? (
            <p className="text-muted-foreground">Calculating preview…</p>
          ) : previewError ? (
            <p className="text-destructive">{previewError}</p>
          ) : formattedPreview !== null ? (
            <p className="text-muted-foreground">
              Preview
              {previewPeriod ? ` (${formatWeekLabel(previewPeriod)})` : ""}:{" "}
              <span className="font-medium text-foreground">{formattedPreview}</span>
            </p>
          ) : null}
        </div>
      ) : null}
      <Input
        className="h-8"
        value={query}
        disabled={disabled}
        placeholder="Search measurables to insert…"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {isPending ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No measurables found</p>
          ) : (
            <ul>
              {suggestedResults.length > 0 ? (
                <>
                  <li className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Suggested
                  </li>
                  {suggestedResults.map((result) => (
                    <li key={result.token}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertMetric(result)}
                      >
                        {result.label}
                      </button>
                    </li>
                  ))}
                  {otherResults.length > 0 ? (
                    <li className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      All measurables
                    </li>
                  ) : null}
                </>
              ) : null}
              {otherResults.map((result) => (
                <li key={result.token}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertMetric(result)}
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Input({
  className,
  ...props
}: React.ComponentProps<"input"> & { className?: string }) {
  return (
    <input
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}
