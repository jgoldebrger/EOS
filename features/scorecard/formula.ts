export interface MetricRef {
  organizationId: string;
  metricId: string;
}

export interface FormulaMetricToken {
  type: "metric";
  organizationId: string;
  metricId: string;
  label?: string;
}

export type CompareOp = ">" | "<" | ">=" | "<=" | "=";

export type FormulaFuncName =
  | "SUM"
  | "AVG"
  | "AVERAGE"
  | "MIN"
  | "MAX"
  | "IF"
  | "ROUND"
  | "ABS"
  | "COUNT";

export type FormulaAst =
  | { kind: "number"; value: number }
  | { kind: "metric"; refIndex: number }
  | { kind: "unary"; op: "-"; expr: FormulaAst }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: FormulaAst; right: FormulaAst }
  | { kind: "compare"; op: CompareOp; left: FormulaAst; right: FormulaAst }
  | { kind: "call"; name: FormulaFuncName; args: FormulaAst[] };

const METRIC_TOKEN_PATTERN =
  /\{\{metric:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\}\}/gi;

const FORMULA_FUNCTIONS = new Set<string>([
  "SUM",
  "AVG",
  "AVERAGE",
  "MIN",
  "MAX",
  "IF",
  "ROUND",
  "ABS",
  "COUNT",
]);

export function metricRefKey(organizationId: string, metricId: string): string {
  return `${organizationId}:${metricId}`;
}

export function parseMetricRefsFromFormula(formula: string): MetricRef[] {
  const refs: MetricRef[] = [];
  const seen = new Set<string>();
  const re = new RegExp(METRIC_TOKEN_PATTERN.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = re.exec(formula)) !== null) {
    const organizationId = match[1]!;
    const metricId = match[2]!;
    const key = metricRefKey(organizationId, metricId);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ organizationId, metricId });
    }
  }

  return refs;
}

export function parseFormulaTokens(
  tokens: unknown,
): FormulaMetricToken[] {
  if (!Array.isArray(tokens)) {
    return [];
  }

  return tokens.filter(
    (token): token is FormulaMetricToken =>
      typeof token === "object" &&
      token !== null &&
      (token as FormulaMetricToken).type === "metric" &&
      typeof (token as FormulaMetricToken).organizationId === "string" &&
      typeof (token as FormulaMetricToken).metricId === "string",
  );
}

export function metricRefsFromTokens(tokens: FormulaMetricToken[]): MetricRef[] {
  return tokens.map((token) => ({
    organizationId: token.organizationId,
    metricId: token.metricId,
  }));
}

export function buildFormulaTokens(
  formula: string,
  labelByKey?: Map<string, string>,
): FormulaMetricToken[] {
  return parseMetricRefsFromFormula(formula).map((ref) => ({
    type: "metric" as const,
    organizationId: ref.organizationId,
    metricId: ref.metricId,
    label: labelByKey?.get(metricRefKey(ref.organizationId, ref.metricId)),
  }));
}

export const FORMULA_DISPLAY_LABEL_OPEN = "«";
export const FORMULA_DISPLAY_LABEL_CLOSE = "»";

const DISPLAY_LABEL_PATTERN = /«([^»]*)»/g;

export function metricTokenString(organizationId: string, metricId: string): string {
  return `{{metric:${organizationId}:${metricId}}}`;
}

export function buildFormulaLabelMap(
  tokens?: FormulaMetricToken[] | null,
): Map<string, string> {
  const labelByKey = new Map<string, string>();
  for (const token of tokens ?? []) {
    if (token.label) {
      labelByKey.set(metricRefKey(token.organizationId, token.metricId), token.label);
    }
  }
  return labelByKey;
}

export function buildLabelToTokenMap(
  tokens?: FormulaMetricToken[] | null,
): Map<string, string> {
  const labelToToken = new Map<string, string>();
  for (const token of tokens ?? []) {
    if (token.label) {
      labelToToken.set(
        token.label,
        metricTokenString(token.organizationId, token.metricId),
      );
    }
  }
  return labelToToken;
}

export function wrapFormulaDisplayLabel(label: string): string {
  return `${FORMULA_DISPLAY_LABEL_OPEN}${label}${FORMULA_DISPLAY_LABEL_CLOSE}`;
}

export function formatFormulaForDisplay(
  formula: string,
  tokens?: FormulaMetricToken[] | null,
): string {
  const labelByKey = buildFormulaLabelMap(tokens);

  return formula.replace(
    new RegExp(METRIC_TOKEN_PATTERN.source, "gi"),
    (_match, orgId: string, metricId: string) =>
      wrapFormulaDisplayLabel(
        labelByKey.get(metricRefKey(orgId, metricId)) ?? "Unknown metric",
      ),
  );
}

export function parseFormulaFromDisplay(
  display: string,
  labelToToken: Map<string, string>,
): string {
  return display.replace(DISPLAY_LABEL_PATTERN, (match, label: string) => {
    return labelToToken.get(label) ?? match;
  });
}

export function isFormulaIncompleteWhileTyping(formula: string): boolean {
  const trimmed = formula.trim();
  if (!trimmed) {
    return false;
  }

  if (/[+\-*/]\s*$/.test(trimmed)) {
    return true;
  }

  if (/,\s*$/.test(trimmed)) {
    return true;
  }

  if (/[<>]=?\s*$/.test(trimmed)) {
    return true;
  }

  let depth = 0;
  for (const ch of trimmed) {
    if (ch === "(") {
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
    }
  }

  return depth > 0;
}

export function humanizeFormulaParseError(
  error: string,
  formula?: string,
): string {
  const trimmed = formula?.trim() ?? "";

  if (error === "Expected number, metric, function, or parenthesis") {
    if (/[+\-*/]\s*$/.test(trimmed)) {
      return "Formula can't end with an operator — add a number or measurable after it";
    }
    if (/,\s*$/.test(trimmed)) {
      return "Formula can't end with a comma — add another argument";
    }
    if (/[<>]=?\s*$/.test(trimmed)) {
      return "Formula can't end with a comparison — add a value to compare against";
    }
  }

  return error;
}

export function getFormulaPreviewError(formula: string): string | null {
  const trimmed = formula.trim();
  if (!trimmed) {
    return null;
  }

  if (isFormulaIncompleteWhileTyping(trimmed)) {
    return null;
  }

  const parsed = parseFormula(trimmed);
  if ("error" in parsed) {
    return humanizeFormulaParseError(parsed.error, trimmed);
  }

  if (parsed.refs.length === 0) {
    return "Formula must reference at least one measurable";
  }

  return null;
}

function replaceMetricTokensWithPlaceholders(formula: string): {
  expression: string;
  refs: MetricRef[];
} {
  const refs: MetricRef[] = [];
  const keyToIndex = new Map<string, number>();

  const expression = formula.replace(
    new RegExp(METRIC_TOKEN_PATTERN.source, "gi"),
    (_match, orgId: string, metricId: string) => {
      const key = metricRefKey(orgId, metricId);
      let index = keyToIndex.get(key);
      if (index === undefined) {
        index = refs.length;
        keyToIndex.set(key, index);
        refs.push({ organizationId: orgId, metricId });
      }
      return `\x00REF${index}\x00`;
    },
  );

  return { expression, refs };
}

type LexToken =
  | { type: "number"; value: number }
  | { type: "metric"; index: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "compare"; value: CompareOp }
  | { type: "ident"; name: string }
  | { type: "comma" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "eof" };

function tokenizeExpression(expression: string): LexToken[] | { error: string } {
  const tokens: LexToken[] = [];
  let i = 0;

  while (i < expression.length) {
    const ch = expression[i]!;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }

    if (ch === ",") {
      tokens.push({ type: "comma" });
      i += 1;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    const twoCharCompare = expression.slice(i, i + 2);
    if (twoCharCompare === ">=" || twoCharCompare === "<=") {
      tokens.push({ type: "compare", value: twoCharCompare });
      i += 2;
      continue;
    }

    if (ch === ">" || ch === "<" || ch === "=") {
      tokens.push({ type: "compare", value: ch as CompareOp });
      i += 1;
      continue;
    }

    if (ch === "\x00") {
      const placeholderMatch = expression.slice(i).match(/^\x00REF(\d+)\x00/);
      if (!placeholderMatch) {
        return { error: "Invalid formula expression" };
      }
      tokens.push({ type: "metric", index: Number(placeholderMatch[1]) });
      i += placeholderMatch[0].length;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const numberMatch = expression.slice(i).match(/^\d+(\.\d+)?/);
      if (!numberMatch) {
        return { error: "Invalid number in formula" };
      }
      tokens.push({ type: "number", value: Number(numberMatch[0]) });
      i += numberMatch[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const identMatch = expression.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!identMatch) {
        return { error: "Invalid identifier in formula" };
      }
      const name = identMatch[0].toUpperCase();
      if (!FORMULA_FUNCTIONS.has(name)) {
        return { error: `Unknown function or identifier "${identMatch[0]}"` };
      }
      tokens.push({ type: "ident", name });
      i += identMatch[0].length;
      continue;
    }

    return { error: `Unexpected character "${ch}" in formula` };
  }

  tokens.push({ type: "eof" });
  return tokens;
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: LexToken[]) {}

  parse(): FormulaAst | { error: string } {
    const expr = this.parseExpression();
    if ("error" in expr) {
      return expr;
    }
    if (this.current().type !== "eof") {
      return { error: "Unexpected tokens after expression end" };
    }
    return expr;
  }

  private current(): LexToken {
    return this.tokens[this.pos] ?? { type: "eof" };
  }

  private consume(): LexToken {
    const token = this.current();
    this.pos += 1;
    return token;
  }

  private parseExpression(): FormulaAst | { error: string } {
    let left = this.parseComparison();
    if ("error" in left) {
      return left;
    }

    while (this.current().type === "op" && (this.current() as { value: string }).value.match(/^[+-]$/)) {
      const op = (this.consume() as { type: "op"; value: "+" | "-" }).value;
      const right = this.parseComparison();
      if ("error" in right) {
        return right;
      }
      left = { kind: "binary", op, left, right };
    }

    return left;
  }

  private parseComparison(): FormulaAst | { error: string } {
    let left = this.parseTerm();
    if ("error" in left) {
      return left;
    }

    if (this.current().type === "compare") {
      const op = (this.consume() as { type: "compare"; value: CompareOp }).value;
      const right = this.parseTerm();
      if ("error" in right) {
        return right;
      }
      return { kind: "compare", op, left, right };
    }

    return left;
  }

  private parseTerm(): FormulaAst | { error: string } {
    let left = this.parseUnary();
    if ("error" in left) {
      return left;
    }

    while (this.current().type === "op" && (this.current() as { value: string }).value.match(/^[*\/]$/)) {
      const op = (this.consume() as { type: "op"; value: "*" | "/" }).value;
      const right = this.parseUnary();
      if ("error" in right) {
        return right;
      }
      left = { kind: "binary", op, left, right };
    }

    return left;
  }

  private parseUnary(): FormulaAst | { error: string } {
    if (this.current().type === "op" && (this.current() as { value: string }).value === "-") {
      this.consume();
      const expr = this.parseUnary();
      if ("error" in expr) {
        return expr;
      }
      return { kind: "unary", op: "-", expr };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): FormulaAst | { error: string } {
    const token = this.current();

    if (token.type === "number") {
      this.consume();
      return { kind: "number", value: token.value };
    }

    if (token.type === "metric") {
      this.consume();
      return { kind: "metric", refIndex: token.index };
    }

    if (token.type === "ident") {
      const name = token.name as FormulaFuncName;
      this.consume();

      if (this.current().type !== "lparen") {
        return { error: `Expected "(" after ${name}` };
      }
      this.consume();

      const args: FormulaAst[] = [];
      if (this.current().type !== "rparen") {
        const firstArg = this.parseExpression();
        if ("error" in firstArg) {
          return firstArg;
        }
        args.push(firstArg);

        while (this.current().type === "comma") {
          this.consume();
          const nextArg = this.parseExpression();
          if ("error" in nextArg) {
            return nextArg;
          }
          args.push(nextArg);
        }
      }

      if (this.current().type !== "rparen") {
        return { error: `Missing closing parenthesis for ${name}` };
      }
      this.consume();

      if (name === "IF" && args.length !== 3) {
        return { error: "IF requires exactly 3 arguments: condition, then, else" };
      }
      if (name === "ABS" && args.length !== 1) {
        return { error: "ABS requires exactly one argument" };
      }
      if (name === "ROUND" && (args.length < 1 || args.length > 2)) {
        return { error: "ROUND requires one or two arguments: value, decimals?" };
      }
      if (name === "COUNT" && args.length === 0) {
        return { error: "COUNT requires at least one argument" };
      }
      if (
        name !== "IF" &&
        name !== "ABS" &&
        name !== "ROUND" &&
        name !== "COUNT" &&
        args.length === 0
      ) {
        return { error: `${name} requires at least one argument` };
      }

      return { kind: "call", name, args };
    }

    if (token.type === "lparen") {
      this.consume();
      const expr = this.parseExpression();
      if ("error" in expr) {
        return expr;
      }
      if (this.current().type !== "rparen") {
        return { error: "Missing closing parenthesis" };
      }
      this.consume();
      return expr;
    }

    return { error: "Expected number, metric, function, or parenthesis" };
  }
}

export function parseFormula(
  formula: string,
): { ast: FormulaAst; refs: MetricRef[] } | { error: string } {
  const trimmed = formula.trim();
  if (!trimmed) {
    return { error: "Formula is required" };
  }

  const { expression, refs } = replaceMetricTokensWithPlaceholders(trimmed);
  const tokens = tokenizeExpression(expression);
  if ("error" in tokens) {
    return tokens;
  }

  const parser = new Parser(tokens);
  const ast = parser.parse();
  if ("error" in ast) {
    return ast;
  }

  return { ast, refs };
}

export function detectFormulaCycle(
  metricId: string,
  organizationId: string,
  dependencies: MetricRef[],
  allFormulaMetrics: Array<{
    id: string;
    organizationId: string;
    formulaTokens: FormulaMetricToken[] | null;
  }>,
): string | null {
  const graph = new Map<string, MetricRef[]>();

  for (const metric of allFormulaMetrics) {
    const deps = metricRefsFromTokens(metric.formulaTokens ?? []);
    graph.set(metricRefKey(metric.organizationId, metric.id), deps);
  }

  graph.set(metricRefKey(organizationId, metricId), dependencies);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);
    for (const dep of graph.get(node) ?? []) {
      const depKey = metricRefKey(dep.organizationId, dep.metricId);
      if (dfs(depKey)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return dfs(metricRefKey(organizationId, metricId))
    ? "Formula creates a circular dependency between measurables"
    : null;
}

export function topologicalSortFormulaMetrics(
  metricKeys: string[],
  dependenciesByKey: Map<string, MetricRef[]>,
): string[] {
  const keySet = new Set(metricKeys);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const key of metricKeys) {
    inDegree.set(key, 0);
    adjacency.set(key, []);
  }

  for (const key of metricKeys) {
    for (const dep of dependenciesByKey.get(key) ?? []) {
      const depKey = metricRefKey(dep.organizationId, dep.metricId);
      if (!keySet.has(depKey)) {
        continue;
      }
      adjacency.get(depKey)!.push(key);
      inDegree.set(key, (inDegree.get(key) ?? 0) + 1);
    }
  }

  const queue = metricKeys.filter((key) => (inDegree.get(key) ?? 0) === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const nextDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, nextDegree);
      if (nextDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length !== metricKeys.length) {
    return metricKeys;
  }

  return sorted;
}

function isTruthy(value: number | null): boolean {
  return value !== null && value !== 0;
}

function evaluateCompare(op: CompareOp, left: number, right: number): number {
  switch (op) {
    case ">":
      return left > right ? 1 : 0;
    case "<":
      return left < right ? 1 : 0;
    case ">=":
      return left >= right ? 1 : 0;
    case "<=":
      return left <= right ? 1 : 0;
    case "=":
      return left === right ? 1 : 0;
    default:
      return 0;
  }
}

function evaluateCall(
  name: FormulaFuncName,
  args: FormulaAst[],
  evalNode: (node: FormulaAst) => number | null,
): number | null {
  if (name === "IF") {
    const [condition, thenBranch, elseBranch] = args;
    if (!condition || !thenBranch || !elseBranch) {
      return null;
    }
    const condValue = evalNode(condition);
    if (condValue === null) {
      return null;
    }
    return isTruthy(condValue) ? evalNode(thenBranch) : evalNode(elseBranch);
  }

  if (name === "COUNT") {
    return args.reduce((count, arg) => {
      const value = evalNode(arg);
      return value !== null ? count + 1 : count;
    }, 0);
  }

  if (name === "ABS") {
    const value = evalNode(args[0]!);
    return value === null ? null : Math.abs(value);
  }

  if (name === "ROUND") {
    const value = evalNode(args[0]!);
    if (value === null) {
      return null;
    }
    const decimals =
      args.length === 2 ? evalNode(args[1]!) : 0;
    if (decimals === null) {
      return null;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  const values = args.map((arg) => evalNode(arg));
  if (values.some((value) => value === null)) {
    return null;
  }
  const nums = values as number[];

  switch (name) {
    case "SUM":
      return nums.reduce((sum, value) => sum + value, 0);
    case "AVG":
    case "AVERAGE":
      return nums.reduce((sum, value) => sum + value, 0) / nums.length;
    case "MIN":
      return Math.min(...nums);
    case "MAX":
      return Math.max(...nums);
    default:
      return null;
  }
}

export function evaluateFormula(
  ast: FormulaAst,
  refs: MetricRef[],
  values: Map<string, number | null>,
): number | null {
  function evalNode(node: FormulaAst): number | null {
    if (node.kind === "number") {
      return node.value;
    }

    if (node.kind === "metric") {
      const ref = refs[node.refIndex];
      if (!ref) {
        return null;
      }
      const value = values.get(metricRefKey(ref.organizationId, ref.metricId));
      return value === undefined ? null : value;
    }

    if (node.kind === "unary") {
      const operand = evalNode(node.expr);
      if (operand === null) {
        return null;
      }
      return -operand;
    }

    if (node.kind === "compare") {
      const left = evalNode(node.left);
      const right = evalNode(node.right);
      if (left === null || right === null) {
        return null;
      }
      return evaluateCompare(node.op, left, right);
    }

    if (node.kind === "call") {
      return evaluateCall(node.name, node.args, evalNode);
    }

    const left = evalNode(node.left);
    const right = evalNode(node.right);

    if (left === null || right === null) {
      return null;
    }

    switch (node.op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) {
          return null;
        }
        return left / right;
      default:
        return null;
    }
  }

  return evalNode(ast);
}

export function validateFormulaExpression(formula: string): string | null {
  const parsed = parseFormula(formula);
  if ("error" in parsed) {
    return parsed.error;
  }

  if (parsed.refs.length === 0) {
    return "Formula must reference at least one measurable";
  }

  return null;
}

export function collectFormulaParseErrors(
  metrics: Array<{ id: string; formula: string | null | undefined }>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const metric of metrics) {
    if (!metric.formula?.trim()) {
      continue;
    }
    const error = validateFormulaExpression(metric.formula);
    if (error) {
      result[metric.id] = error;
    }
  }

  return result;
}

/** Reverse dependency map: source metric id → formula metric ids that reference it. */
export function buildFormulaDependentsMap(
  formulaMetrics: Array<{ id: string; tokens: FormulaMetricToken[] }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const metric of formulaMetrics) {
    for (const token of metric.tokens) {
      const existing = map.get(token.metricId) ?? [];
      existing.push(metric.id);
      map.set(token.metricId, existing);
    }
  }

  return map;
}

export function findDependentMetricIdsFromGraph(
  dependentsBySourceMetricId: Map<string, string[]>,
  sourceMetricIds: string[],
): string[] {
  const result = new Set<string>();

  for (const sourceId of sourceMetricIds) {
    for (const dependentId of dependentsBySourceMetricId.get(sourceId) ?? []) {
      result.add(dependentId);
    }
  }

  return [...result];
}
