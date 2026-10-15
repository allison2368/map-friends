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
      get(
        (h) =>
          h === "name" ||
          h === "full name" ||
          h === "your name" ||
          h.startsWith("what is your name"),
      ) || [firstName, lastName].filter(Boolean).join(" ");

    if (!fullName) continue;

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
      const coords = await geocodeLocation(location);
      lat = coords?.lat ?? null;
      lng = coords?.lng ?? null;
    }

    if (lat == null || lng == null) continue;

    const photos = headers.flatMap((header, index) => {
      if (!looksLike(header, ["photo", "picture", "image", "upload", "file"])) {
        return [];
      }
      return splitPhotoCell(cells[index] ?? "");
    });

    const answers: FriendAnswer[] = [];
    headers.forEach((header, index) => {
      if (
        SKIP_HEADERS.includes(header) ||
        header === "name" ||
        header === "full name" ||
        header === "your name" ||
        header === "first name" ||
        header === "last name" ||
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
          "photo",
          "picture",
          "image",
          "upload",
        ])
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
      id: `${slugify(fullName) || "friend"}-${i}`,
      name: fullName,
      location: location || "United States",
      lat,
      lng,
      photos,
      answers,
    });
  }

  return friends;
}
