const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeLocation(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "map-friends/1.0 (friends map)",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    cache.set(key, null);
    return null;
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];
  const coords = first
    ? { lat: Number(first.lat), lng: Number(first.lon) }
    : null;

  cache.set(key, coords);
  return coords;
}
