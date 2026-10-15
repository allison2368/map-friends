const cache = new Map<string, { lat: number; lng: number } | null>();

type GeocodeHit = {
  lat: string;
  lon: string;
  importance?: number;
  type?: string;
  addresstype?: string;
  display_name?: string;
};

const PLACE_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
  "suburb",
  "neighbourhood",
  "postcode",
  "house",
  "residential",
]);

function chooseHit(query: string, results: GeocodeHit[]): GeocodeHit | undefined {
  const named = query.trim().toLowerCase();
  const places = results.filter((result) =>
    PLACE_TYPES.has(result.addresstype || result.type || ""),
  );
  const pool = places.length > 0 ? places : results;
  return pool.sort((a, b) => {
    const aName = (a.display_name ?? "").toLowerCase().startsWith(named) ? 1 : 0;
    const bName = (b.display_name ?? "").toLowerCase().startsWith(named) ? 1 : 0;
    if (aName !== bName) return bName - aName;
    return (b.importance ?? 0) - (a.importance ?? 0);
  })[0];
}
let lastRequestAt = 0;

async function waitForGeocoder() {
  const elapsed = Date.now() - lastRequestAt;
  const delay = Math.max(0, 1100 - elapsed);
  lastRequestAt = Date.now() + delay;
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export async function geocodeLocation(
  query: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  await waitForGeocoder();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
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

  const results = (await response.json()) as GeocodeHit[];
  const first = chooseHit(query, results);
  const coords = first
    ? { lat: Number(first.lat), lng: Number(first.lon) }
    : null;

  cache.set(key, coords);
  return coords;
}
