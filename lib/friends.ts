import sampleFriends from "@/data/sample-friends.json";
import { applyDrivePhotos, listDriveFolder } from "./drive";
import { siteEnv } from "./site-env";
import { friendsFromCsv } from "./sheet";
import type { Friend, FriendsResponse } from "./types";

function asFriends(value: unknown): Friend[] {
  return value as Friend[];
}

export async function loadFriends(): Promise<FriendsResponse> {
  const sheetUrl = process.env.GOOGLE_SHEETS_CSV_URL || siteEnv.sheetUrl;
  const formUrl =
    process.env.GOOGLE_FORM_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
    siteEnv.formUrl;

  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, { cache: "no-store" });
      if (response.ok) {
        const csv = await response.text();
        let friends = await friendsFromCsv(csv);
        const folderUrl = process.env.GOOGLE_DRIVE_FOLDER_URL || siteEnv.driveFolderUrl;
        if (folderUrl) {
          try {
            const files = await listDriveFolder(folderUrl);
            if (files.length > 0) friends = applyDrivePhotos(friends, files);
          } catch {
            // Keep the sheet photos when the folder cannot be read.
          }
        }
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
