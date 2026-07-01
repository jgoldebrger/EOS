import type { VroomJob, VroomSolution, VroomVehicle } from "@/features/transport/types";

const DEFAULT_VROOM_URL = "http://localhost:3001";

export function getVroomUrl(): string | null {
  return process.env.VROOM_URL ?? process.env.NEXT_PUBLIC_VROOM_URL ?? null;
}

export async function solveVroom(input: {
  jobs: VroomJob[];
  vehicles: VroomVehicle[];
}): Promise<VroomSolution | null> {
  const baseUrl = getVroomUrl() ?? DEFAULT_VROOM_URL;

  try {
    const response = await fetch(`${baseUrl}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobs: input.jobs,
        vehicles: input.vehicles,
        options: { g: true },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as VroomSolution;
  } catch {
    return null;
  }
}

/** Nearest-neighbor fallback when VROOM is unavailable. */
export function nearestNeighborOrder(
  depot: [number, number],
  stops: Array<{ id: string; location: [number, number] }>,
): string[] {
  const remaining = [...stops];
  const ordered: string[] = [];
  let current = depot;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(current, remaining[i].location);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next.id);
    current = next.location;
  }

  return ordered;
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
