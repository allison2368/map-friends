import type { Friend, FriendAnswer } from "./types";
import { parseCsv } from "./csv";
import { geocodeLocation } from "./geocode";
import { splitPhotoCell } from "./photos";

const SKIP_HEADERS = [
  "timestamp",
  "email address",
  "email",
  "score",
];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function looksLike(header: string, needles: string[]): boolean {
  return needles.some((needle) => header.includes(needle));
}

function isNameHeader(header: string): boolean {
  return (
    header === "name" ||
    header.startsWith("name (") ||
    header === "full name" ||
    header === "your name" ||
    header.startsWith("what is your name") ||
    header === "first name" ||
    header === "firstname" ||
    header === "last name" ||
    header === "lastname"
  );
}

function isPhotoHeader(header: string): boolean {
  return (
    /\b(photos?|pictures?)\b/.test(header) ||
    header.includes("file upload") ||
    header === "upload" ||
    header.startsWith("upload ")
  );
}

function usablePlace(value: string): boolean {
  return !/^(home|here|n\/a|na|none|unknown)$/i.test(value.trim());
}

function locationCandidates(raw: string): string[] {
  const stripped = raw
    .replace(/[()!:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const candidates: string[] = [];
  const beforeIn = stripped.split(/\s+in\s+/i)[0]?.trim();
  if (beforeIn && /^\d+\s+/.test(beforeIn) && beforeIn !== stripped) {
    candidates.push(beforeIn);
  }
  const afterDash = stripped.split(" - ").at(-1)?.trim();
  if (afterDash && afterDash.length > 2 && afterDash !== stripped) {
    candidates.push(afterDash);
  }
  const inMatch = stripped.match(/\bin\s+([A-Za-z][A-Za-z .]{1,40})$/i);
  if (inMatch?.[1]) candidates.push(inMatch[1].trim());
  candidates.push(stripped);
  const unique = [...new Set(candidates.filter(usablePlace))];
  if (/san francisco/i.test(stripped)) {
    return [
      "San Francisco",
      ...unique.filter((item) => item.toLowerCase() !== "san francisco"),
    ];
  }
  if (/\bdavis\b/i.test(stripped)) {
    return [
      "Davis, California",
      ...unique.filter((item) => item.toLowerCase() !== "davis, california"),
    ];
  }
  return unique;
}

function formatName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((part) =>
      part
        .split("-")
        .map((piece) =>
          piece
            ? piece.charAt(0).toUpperCase() + piece.slice(1).toLowerCase()
            : piece,
        )
        .join("-"),
    )
    .join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function friendsFromCsv(csv: string): Promise<Friend[]> {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const friends: Friend[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i];
    const get = (headerMatch: (header: string) => boolean) => {
      const index = headers.findIndex(headerMatch);
      return index >= 0 ? (cells[index] ?? "").trim() : "";
    };

    const firstName = get((h) => h === "first name" || h === "firstname");
    const lastName = get((h) => h === "last name" || h === "lastname");
    const fullName =
      get((h) => isNameHeader(h) && h !== "first name" && h !== "firstname" && h !== "last name" && h !== "lastname") ||
      [firstName, lastName].filter(Boolean).join(" ");

    const name = formatName(fullName);
    if (!name) continue;

    const location = get(
      (h) =>
        looksLike(h, [
          "location",
          "city",
          "address",
          "hometown",
          "where do you live",
          "where are you",
        ]) && !looksLike(h, ["photo", "picture", "image"]),
    );

    const latFromSheet = parseNumber(
      get((h) => h === "lat" || h === "latitude"),
    );
    const lngFromSheet = parseNumber(
      get((h) => h === "lng" || h === "lon" || h === "long" || h === "longitude"),
    );

    let lat = latFromSheet;
    let lng = lngFromSheet;

    if ((lat == null || lng == null) && location) {
      for (const candidate of locationCandidates(location)) {
        const coords = await geocodeLocation(candidate);
        if (!coords) continue;
        lat = coords.lat;
        lng = coords.lng;
        break;
      }
    }

    if (lat == null || lng == null) continue;

    const photos = headers.flatMap((header, index) => {
      if (!isPhotoHeader(header)) return [];
      return splitPhotoCell(cells[index] ?? "").filter((url) =>
        /^https?:\/\//i.test(url) || url.startsWith("/api/photo?"),
      );
    });

    const answers: FriendAnswer[] = [];
    headers.forEach((header, index) => {
      if (
        SKIP_HEADERS.includes(header) ||
        isNameHeader(header) ||
        header === "lat" ||
        header === "latitude" ||
        header === "lng" ||
        header === "lon" ||
        header === "long" ||
        header === "longitude" ||
        looksLike(header, [
          "location",
          "city",
          "address",
          "hometown",
          "where do you live",
          "where are you",
        ]) ||
        isPhotoHeader(header)
      ) {
        return;
      }

      const answer = (cells[index] ?? "").trim();
      if (!answer) return;
      answers.push({
        question: rows[0][index]?.trim() || header,
        answer,
      });
    });

    friends.push({
      id: `${slugify(name) || "friend"}-${i}`,
      name,
      location: location || "United States",
      lat,
      lng,
      photos,
      answers,
    });
  }

  return mergeSamePerson(friends);
}

function mergeSamePerson(friends: Friend[]): Friend[] {
  const merged: Friend[] = [];
  for (const friend of friends) {
    const existing = merged.find(
      (item) => item.name.trim().toLowerCase() === friend.name.trim().toLowerCase(),
    );
    if (!existing) {
      merged.push({ ...friend, photos: [...friend.photos] });
      continue;
    }
    const seen = new Set(existing.photos);
    for (const photo of friend.photos) {
      if (seen.has(photo)) continue;
      existing.photos.push(photo);
      seen.add(photo);
    }
  }
  return merged;
}
