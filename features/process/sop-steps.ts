import type { SopDocument } from "@/features/process/schema";

export function createEmptyStep(): SopDocument["steps"][number] {
  return {
    title: "",
    time: "",
    note: "",
    dependencies: [],
    imageUrl: "",
    approver: "",
    approvalStatus: "pending",
  };
}

export function duplicateStep(
  step: SopDocument["steps"][number],
): SopDocument["steps"][number] {
  return {
    ...step,
    dependencies: [...step.dependencies],
    title: step.title ? `${step.title} (copy)` : "",
  };
}

export function moveStep(
  steps: SopDocument["steps"],
  from: number,
  direction: "up" | "down",
): SopDocument["steps"] {
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= steps.length) return steps;

  const next = [...steps];
  [next[from], next[to]] = [next[to], next[from]];

  const indexMap = new Map<number, number>();
  for (let i = 0; i < steps.length; i += 1) {
    if (i === from) indexMap.set(i, to);
    else if (i === to) indexMap.set(i, from);
    else indexMap.set(i, i);
  }

  return next.map((step, stepIndex) => ({
    ...step,
    dependencies: step.dependencies
      .map((dep) => indexMap.get(dep) ?? dep)
      .filter((dep) => dep >= 0 && dep < next.length && dep !== stepIndex),
  }));
}

export function deleteStepAt(
  steps: SopDocument["steps"],
  index: number,
): SopDocument["steps"] {
  const next = steps.filter((_, i) => i !== index);

  return next.map((step, stepIndex) => ({
    ...step,
    dependencies: step.dependencies
      .filter((dep) => dep !== index)
      .map((dep) => (dep > index ? dep - 1 : dep))
      .filter((dep) => dep >= 0 && dep < next.length && dep !== stepIndex),
  }));
}

export function toggleStepDependency(
  steps: SopDocument["steps"],
  stepIndex: number,
  dependencyIndex: number,
): SopDocument["steps"] {
  return steps.map((step, index) => {
    if (index !== stepIndex) return step;

    const has = step.dependencies.includes(dependencyIndex);
    const dependencies = has
      ? step.dependencies.filter((dep) => dep !== dependencyIndex)
      : [...step.dependencies, dependencyIndex].sort((a, b) => a - b);

    return { ...step, dependencies };
  });
}
