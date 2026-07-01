import type { TransportLoadStatusDb } from "@/types/database";

export const LOAD_STATUS_ORDER: TransportLoadStatusDb[] = [
  "quote",
  "dispatched",
  "in_transit",
  "delivered",
  "cancelled",
];

export const DISPATCH_COLUMNS: TransportLoadStatusDb[] = [
  "quote",
  "dispatched",
  "in_transit",
  "delivered",
];

export function formatLoadLabel(loadNumber: number): string {
  return `LD-${loadNumber}`;
}

export function formatLoadStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function formatStopType(stopType: string): string {
  return stopType.replace(/_/g, " ");
}

export function groupLoadsByStatus<T extends { status: TransportLoadStatusDb }>(
  loads: T[],
): Map<TransportLoadStatusDb, T[]> {
  const map = new Map<TransportLoadStatusDb, T[]>();
  for (const col of DISPATCH_COLUMNS) {
    map.set(col, []);
  }
  for (const load of loads) {
    if (DISPATCH_COLUMNS.includes(load.status)) {
      map.get(load.status)?.push(load);
    }
  }
  return map;
}

/** Approximate geodesic circle for demo isochrones when Ferrobus worker is unavailable. */
export function circleGeoJson(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  points = 64,
): { type: "Polygon"; coordinates: [number, number][][] } {
  const coords: [number, number][] = [];
  const earthRadius = 6371000;
  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const bearing = (2 * Math.PI * i) / points;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(radiusMeters / earthRadius) +
        Math.cos(latRad) *
          Math.sin(radiusMeters / earthRadius) *
          Math.cos(bearing),
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusMeters / earthRadius) * Math.cos(latRad),
        Math.cos(radiusMeters / earthRadius) - Math.sin(latRad) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return {
    type: "Polygon",
    coordinates: [coords],
  };
}
