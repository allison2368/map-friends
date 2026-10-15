import sampleFriends from "@/data/sample-friends.json";
import { friendsFromCsv } from "./sheet";
import type { Friend, FriendsResponse } from "./types";

function asFriends(value: unknown): Friend[] {
  return value as Friend[];
}

export async function loadFriends(): Promise<FriendsResponse> {
  const sheetUrl = process.env.GOOGLE_SHEETS_CSV_URL;
  const formUrl = process.env.GOOGLE_FORM_URL ?? process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ?? null;

  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, { cache: "no-store" });
      if (response.ok) {
        const csv = await response.text();
        const friends = await friendsFromCsv(csv);
        if (friends.length > 0) {
          return { friends, formUrl, source: "google-sheet" };
        }
      }
    } catch {
      // Fall through to sample pins so the map still works.
    }
  }

  return {
    friends: asFriends(sampleFriends),
    formUrl,
    source: "sample",
  };
}
