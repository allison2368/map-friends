import type { Friend } from "./types";

export type DriveFile = {
  id: string;
  name: string;
};

const ALIASES: Record<string, string> = {
  "theodore pan": "theo pan",
  "nicholas wang": "nich wang",
};

let cached: { folderId: string; at: number; files: DriveFile[] } | null = null;

export function folderIdFromUrl(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function listDriveFolder(folderUrl: string): Promise<DriveFile[]> {
  const folderId = folderIdFromUrl(folderUrl);
  if (!folderId) return [];
  if (cached && cached.folderId === folderId && Date.now() - cached.at < 5 * 60 * 1000) {
    return cached.files;
  }

  const response = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${folderId}`,
    {
      headers: { "User-Agent": "map-friends/1.0 (friends map)" },
      cache: "no-store",
    },
  );
  if (!response.ok) return [];

  const html = await response.text();
  const files: DriveFile[] = [];
  const pattern =
    /id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
  for (const match of html.matchAll(pattern)) {
    files.push({ id: match[1], name: match[2].trim() });
  }
  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }),
  );
  cached = { folderId, at: Date.now(), files };
  return files;
}

function segments(name: string): string[] {
  const base = name.replace(/\.[a-z0-9]+$/i, "").trim().toLowerCase();
  return base
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function matchFriend(fileName: string, friends: Friend[]): Friend | null {
  for (const segment of segments(fileName)) {
    const normalized = ALIASES[segment] ?? segment;
    const byName = friends.filter(
      (friend) => friend.name.toLowerCase() === normalized,
    );
    if (byName.length === 1) return byName[0];
    const byFirst = friends.filter(
      (friend) => friend.name.toLowerCase().split(/\s+/)[0] === normalized,
    );
    if (byFirst.length === 1) return byFirst[0];
  }
  return null;
}

const FIRST_PHOTO: Record<string, string> = {
  "abigail yuen": "14UH_Fz0cPX4SD-bmY9nsVS0L4al8Pyne",
  "allison peng": "11G68nCLO7Ug8A4szzwJGKN-JJV3HT19L",
  "chloe chuang": "1MeJKsTEhAWk0gGFtZv8njSjxTRK5X8TG",
  "christine du": "1oheMoMWFgJxdlpOxMZ474G8f1g9NGDO5",
  "christopher chen": "18a09Gs3vTOEqkLR510FRe5EkbLAw7HSz",
  "connor wong": "1qgOx8Si1AeAzOsIZOyCoXzESek9RZTG4",
  "curtis lee": "1WibZ_Dlv_F8sZ6AX0ApSdOK-irV7pHmN",
  "dominic chan": "1x0Zc302g5bMbhNYom9BYLWW5gayfTaAT",
  "elise kim": "1dBilAzm3O21ge0XiDSL22fvNnS6knPs2",
  "katie quan": "1vtYthMakEkOrFM-2cCOikPVCi7EW7Afr",
  "kevin bao": "1m3qupHTkUYlNBc-1tLsD6cdAyY4RLr_S",
  "lawrence chen": "1n9U7ztoZ_yxGdBixBRVilZR7KfpueeJn",
  "michelle kong": "1lULqWXW2shnUwWWo6HMn94EYf3ReIfnd",
  "nich wang": "1Bu8hCYdFC0v0j4t1JRDb1wHHjUzQ43KW",
  "samuel li": "1UzSphXYYl7NNZIYSUUorcnFWpeT1aj6x",
  "justin wu": "1ZNY_vzNVkpbzAKfxfySZSV29bm0CXefO",
  "sunhee choi": "1B5hHowfO6mgFErAOrKmdS5VslwyC2dXh",
  "theo pan": "1BCGRVR12jauQ4jyJZkwpaopyqVBgZLxr",
  "tosca wong": "1RCIS77LCNVziNO0f0DdsyxfELmx7aqdC",
  "wesley han": "1FkiMqIMmKlEvlBiANB76tgsTqdukc9tx",
  "zachary gee": "1ZWmcRNz3upm1d5AM-qcZocq7eFkJ9_cc",
};

const LAST_PHOTO: Record<string, string> = {
  "christine du": "1r-yVW7pnziFc90CxE96QXBhKnl-NtLo6",
};

function pullPhoto(photos: string[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  const index = photos.findIndex((url) => url.includes(`id=${id}`));
  if (index < 0) return undefined;
  return photos.splice(index, 1)[0];
}

function orderPhotos(friend: Friend, photos: string[]): string[] {
  const remaining = [...photos];
  const key = friend.name.toLowerCase();
  const first = pullPhoto(remaining, FIRST_PHOTO[key]);
  const last = pullPhoto(remaining, LAST_PHOTO[key]);
  return [first, ...remaining, last].filter((photo): photo is string => Boolean(photo));
}

export function applyDrivePhotos(friends: Friend[], files: DriveFile[]): Friend[] {
  const photos = new Map<string, string[]>();
  for (const file of files) {
    const friend = matchFriend(file.name, friends);
    if (!friend) continue;
    const url = `/api/photo?id=${file.id}`;
    const list = photos.get(friend.id) ?? [];
    if (!list.includes(url)) list.push(url);
    photos.set(friend.id, list);
  }

  return friends.map((friend) => {
    const drivePhotos = photos.get(friend.id);
    if (!drivePhotos || drivePhotos.length === 0) return friend;
    return { ...friend, photos: orderPhotos(friend, drivePhotos) };
  });
}
