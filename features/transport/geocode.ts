export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "EOS-Platform/1.0 (transport-module)" },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 86400 },
    });

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const hit = results[0];
    if (!hit) return null;

    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

export async function geocodeStops<
  T extends { address: string; latitude?: number | null; longitude?: number | null },
>(stops: T[]): Promise<T[]> {
  const resolved: T[] = [];
  for (const stop of stops) {
    if (stop.latitude != null && stop.longitude != null) {
      resolved.push(stop);
      continue;
    }
    const geo = await geocodeAddress(stop.address);
    resolved.push(
      geo
        ? { ...stop, latitude: geo.latitude, longitude: geo.longitude }
        : stop,
    );
    await new Promise((r) => setTimeout(r, 1100));
  }
  return resolved;
}
