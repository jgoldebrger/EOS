import { describe, expect, it } from "vitest";
import {
  buildFormulaDependentsMap,
  collectFormulaParseErrors,
  detectFormulaCycle,
  evaluateFormula,
  findDependentMetricIdsFromGraph,
  formatFormulaForDisplay,
  getFormulaPreviewError,
  humanizeFormulaParseError,
  isFormulaIncompleteWhileTyping,
  metricRefKey,
  parseFormula,
  parseFormulaFromDisplay,
  parseMetricRefsFromFormula,
  topologicalSortFormulaMetrics,
  validateFormulaExpression,
  wrapFormulaDisplayLabel,
  type FormulaMetricToken,
} from "@/features/scorecard/formula";

const ORG = "11111111-1111-1111-1111-111111111111";
const M1 = "22222222-2222-2222-2222-222222222222";
const M2 = "33333333-3333-3333-3333-333333333333";
const M3 = "44444444-4444-4444-4444-444444444444";

function token(orgId: string, metricId: string) {
  return `{{metric:${orgId}:${metricId}}}`;
}

describe("parseMetricRefsFromFormula", () => {
  it("extracts unique metric references", () => {
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)} + ${token(ORG, M1)}`;
    expect(parseMetricRefsFromFormula(formula)).toEqual([
      { organizationId: ORG, metricId: M1 },
      { organizationId: ORG, metricId: M2 },
    ]);
  });
});

describe("parseFormula", () => {
  it("parses arithmetic with metric tokens", () => {
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)} / 2`;
    const parsed = parseFormula(formula);
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) {
      return;
    }
    expect(parsed.refs).toHaveLength(2);
  });

  it("rejects invalid characters", () => {
    const parsed = parseFormula(`${token(ORG, M1)} & 2`);
    expect(parsed).toEqual({ error: expect.stringContaining("Unexpected") });
  });
});

function evaluate(formula: string, values: Map<string, number | null>) {
  const parsed = parseFormula(formula);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  return evaluateFormula(parsed.ast, parsed.refs, values);
}

describe("evaluateFormula", () => {
  it("evaluates addition", () => {
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)}`;
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), 5],
    ]);

    expect(evaluate(formula, values)).toBe(15);
  });

  it("returns null when operands are missing", () => {
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)}`;
    const values = new Map<string, number | null>([[metricRefKey(ORG, M1), 10]]);
    expect(evaluate(formula, values)).toBeNull();
  });

  it("returns null on division by zero", () => {
    const formula = `${token(ORG, M1)} / ${token(ORG, M2)}`;
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), 0],
    ]);

    expect(evaluate(formula, values)).toBeNull();
  });

  it("evaluates SUM with literals and metrics", () => {
    const formula = `SUM(${token(ORG, M1)}, ${token(ORG, M2)}, 3)`;
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), 5],
    ]);
    expect(evaluate(formula, values)).toBe(18);
  });

  it("evaluates AVG and AVERAGE aliases", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), 20],
    ]);
    expect(evaluate(`AVG(${token(ORG, M1)}, ${token(ORG, M2)})`, values)).toBe(15);
    expect(evaluate(`AVERAGE(${token(ORG, M1)}, ${token(ORG, M2)})`, values)).toBe(15);
  });

  it("evaluates MIN and MAX", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), 20],
    ]);
    expect(evaluate(`MIN(${token(ORG, M1)}, ${token(ORG, M2)})`, values)).toBe(10);
    expect(evaluate(`MAX(${token(ORG, M1)}, ${token(ORG, M2)})`, values)).toBe(20);
  });

  it("evaluates IF with comparisons", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 12],
      [metricRefKey(ORG, M2), 5],
    ]);
    const formula = `IF(${token(ORG, M1)} >= 10, ${token(ORG, M2)}, 0)`;
    expect(evaluate(formula, values)).toBe(5);

    const elseFormula = `IF(${token(ORG, M1)} < 10, 100, 200)`;
    expect(evaluate(elseFormula, values)).toBe(200);
  });

  it("evaluates nested functions", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 4],
      [metricRefKey(ORG, M2), 6],
    ]);
    const formula = `SUM(${token(ORG, M1)}, AVG(${token(ORG, M2)}, 8))`;
    expect(evaluate(formula, values)).toBe(11);
  });

  it("evaluates nested IF expressions", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 12],
      [metricRefKey(ORG, M2), 5],
    ]);
    const formula = `IF(IF(${token(ORG, M1)} >= 10, 1, 0) = 1, ${token(ORG, M2)}, 0)`;
    expect(evaluate(formula, values)).toBe(5);

    const falseBranch = `IF(IF(${token(ORG, M1)} < 10, 1, 0) = 1, 100, 200)`;
    expect(evaluate(falseBranch, values)).toBe(200);
  });

  it("evaluates ROUND with optional decimals", () => {
    const values = new Map<string, number | null>([[metricRefKey(ORG, M1), 10]]);
    expect(evaluate(`ROUND(${token(ORG, M1)} / 3, 2)`, values)).toBe(3.33);
    expect(evaluate(`ROUND(${token(ORG, M1)} / 3)`, values)).toBe(3);
  });

  it("evaluates ABS", () => {
    const values = new Map<string, number | null>([[metricRefKey(ORG, M1), -7]]);
    expect(evaluate(`ABS(${token(ORG, M1)})`, values)).toBe(7);
  });

  it("evaluates COUNT ignoring null arguments", () => {
    const values = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 10],
      [metricRefKey(ORG, M2), null],
    ]);
    expect(evaluate(`COUNT(${token(ORG, M1)}, ${token(ORG, M2)}, 5)`, values)).toBe(2);
  });
});

describe("parseFormula functions", () => {
  it("parses function calls case-insensitively", () => {
    const parsed = parseFormula(`sum(${token(ORG, M1)}, 2)`);
    expect("error" in parsed).toBe(false);
  });

  it("rejects unknown functions", () => {
    const parsed = parseFormula(`FOO(${token(ORG, M1)})`);
    expect(parsed).toEqual({ error: expect.stringContaining("Unknown") });
  });

  it("requires three arguments for IF", () => {
    const parsed = parseFormula(`IF(${token(ORG, M1)} > 1, 2)`);
    expect(parsed).toEqual({ error: expect.stringContaining("IF requires") });
  });
});

describe("detectFormulaCycle", () => {
  it("detects direct cycles", () => {
    const error = detectFormulaCycle(
      M1,
      ORG,
      [{ organizationId: ORG, metricId: M2 }],
      [
        {
          id: M1,
          organizationId: ORG,
          formulaTokens: [{ type: "metric", organizationId: ORG, metricId: M2 }],
        },
        {
          id: M2,
          organizationId: ORG,
          formulaTokens: [{ type: "metric", organizationId: ORG, metricId: M1 }],
        },
      ],
    );

    expect(error).toMatch(/circular/i);
  });

  it("detects cycles for new metrics with provisional id", () => {
    const newMetricId = "55555555-5555-5555-5555-555555555555";
    const error = detectFormulaCycle(
      newMetricId,
      ORG,
      [{ organizationId: ORG, metricId: M2 }],
      [
        {
          id: M2,
          organizationId: ORG,
          formulaTokens: [{ type: "metric", organizationId: ORG, metricId: newMetricId }],
        },
      ],
    );

    expect(error).toMatch(/circular/i);
  });
});

describe("topologicalSortFormulaMetrics", () => {
  it("orders dependencies before dependents", () => {
    const deps = new Map([
      [metricRefKey(ORG, M1), [{ organizationId: ORG, metricId: M2 }]],
      [metricRefKey(ORG, M3), [{ organizationId: ORG, metricId: M1 }]],
      [metricRefKey(ORG, M2), []],
    ]);

    const sorted = topologicalSortFormulaMetrics(
      [metricRefKey(ORG, M1), metricRefKey(ORG, M2), metricRefKey(ORG, M3)],
      deps,
    );

    expect(sorted.indexOf(metricRefKey(ORG, M2))).toBeLessThan(
      sorted.indexOf(metricRefKey(ORG, M1)),
    );
    expect(sorted.indexOf(metricRefKey(ORG, M1))).toBeLessThan(
      sorted.indexOf(metricRefKey(ORG, M3)),
    );
  });
});

describe("validateFormulaExpression", () => {
  it("requires at least one measurable reference", () => {
    expect(validateFormulaExpression("1 + 2")).toMatch(/at least one/i);
  });
});

describe("formatFormulaForDisplay", () => {
  it("replaces tokens with guillemet-wrapped labels", () => {
    const formula = `${token(ORG, M1)} + 1`;
    const display = formatFormulaForDisplay(formula, [
      {
        type: "metric",
        organizationId: ORG,
        metricId: M1,
        label: "Revenue (Sales Team)",
      },
    ]);
    expect(display).toBe(`${wrapFormulaDisplayLabel("Revenue (Sales Team)")} + 1`);
  });

  it("shows unknown metric when label is missing", () => {
    const formula = `${token(ORG, M1)} + 1`;
    expect(formatFormulaForDisplay(formula)).toBe(
      `${wrapFormulaDisplayLabel("Unknown metric")} + 1`,
    );
  });
});

describe("parseFormulaFromDisplay", () => {
  it("converts display labels back to metric tokens", () => {
    const label = "Revenue (Sales Team)";
    const canonical = token(ORG, M1);
    const display = `${wrapFormulaDisplayLabel(label)} + 1`;
    const labelToToken = new Map([[label, canonical]]);

    expect(parseFormulaFromDisplay(display, labelToToken)).toBe(`${canonical} + 1`);
  });

  it("round-trips through display formatting", () => {
    const tokens: FormulaMetricToken[] = [
      {
        type: "metric",
        organizationId: ORG,
        metricId: M1,
        label: "Revenue (Sales Team)",
      },
      {
        type: "metric",
        organizationId: ORG,
        metricId: M2,
        label: "Cost (Ops)",
      },
    ];
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)} / 2`;
    const display = formatFormulaForDisplay(formula, tokens);
    const labelToToken = new Map(
      tokens.map((entry) => [
        entry.label!,
        token(entry.organizationId, entry.metricId),
      ]),
    );

    expect(parseFormulaFromDisplay(display, labelToToken)).toBe(formula);
  });
});

describe("isFormulaIncompleteWhileTyping", () => {
  it("treats trailing operators as incomplete", () => {
    expect(isFormulaIncompleteWhileTyping(`${token(ORG, M1)} +`)).toBe(true);
    expect(isFormulaIncompleteWhileTyping(`${token(ORG, M1)} -`)).toBe(true);
    expect(isFormulaIncompleteWhileTyping(`${token(ORG, M1)} *`)).toBe(true);
    expect(isFormulaIncompleteWhileTyping(`${token(ORG, M1)} /`)).toBe(true);
  });

  it("treats complete formulas as not incomplete", () => {
    expect(isFormulaIncompleteWhileTyping(`${token(ORG, M1)} + 1`)).toBe(false);
  });
});

describe("humanizeFormulaParseError", () => {
  it("explains trailing operator errors", () => {
    const formula = `${token(ORG, M1)} +`;
    const parsed = parseFormula(formula);
    expect("error" in parsed).toBe(true);
    if ("error" in parsed) {
      expect(humanizeFormulaParseError(parsed.error, formula)).toMatch(
        /can't end with an operator/i,
      );
    }
  });
});

describe("getFormulaPreviewError", () => {
  it("suppresses errors while formula ends with an operator", () => {
    expect(getFormulaPreviewError(`${token(ORG, M1)} +`)).toBeNull();
  });

  it("returns humanized errors for invalid complete formulas", () => {
    expect(getFormulaPreviewError(`${token(ORG, M1)} & 2`)).toMatch(/Unexpected/i);
  });
});

describe("collectFormulaParseErrors", () => {
  it("returns parse errors keyed by metric id", () => {
    const errors = collectFormulaParseErrors([
      { id: M1, formula: `${token(ORG, M1)} & 2` },
      { id: M2, formula: `${token(ORG, M1)} + 1` },
      { id: M3, formula: null },
    ]);

    expect(errors[M1]).toMatch(/Unexpected/i);
    expect(errors[M2]).toBeUndefined();
    expect(errors[M3]).toBeUndefined();
  });
});

describe("buildFormulaDependentsMap", () => {
  it("maps source metric ids to dependent formula metric ids", () => {
    const tokens = (metricId: string): FormulaMetricToken[] => [
      { type: "metric", organizationId: ORG, metricId },
    ];

    const graph = buildFormulaDependentsMap([
      { id: M1, tokens: tokens(M2) },
      { id: M3, tokens: tokens(M2) },
    ]);

    expect(graph.get(M2)).toEqual([M1, M3]);
    expect(findDependentMetricIdsFromGraph(graph, [M2])).toEqual(
      expect.arrayContaining([M1, M3]),
    );
    expect(findDependentMetricIdsFromGraph(graph, [M1])).toEqual([]);
  });
});

describe("daily formula evaluation pattern", () => {
  it("evaluates per-day values then rolls up with sum", () => {
    const formula = `${token(ORG, M1)} + ${token(ORG, M2)}`;
    const mondayValues = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 2],
      [metricRefKey(ORG, M2), 3],
    ]);
    const tuesdayValues = new Map<string, number | null>([
      [metricRefKey(ORG, M1), 4],
      [metricRefKey(ORG, M2), 1],
    ]);

    const monday = evaluate(formula, mondayValues);
    const tuesday = evaluate(formula, tuesdayValues);
    expect(monday).toBe(5);
    expect(tuesday).toBe(5);

    const rolled = (monday ?? 0) + (tuesday ?? 0);
    expect(rolled).toBe(10);
  });
});
