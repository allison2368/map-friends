function extractDriveId(value: string): string | null {
  const idParam = value.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return idParam[1];
  const filePath = value.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (filePath) return filePath[1];
  const openPath = value.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openPath) return openPath[1];
  return null;
}

export function normalizePhotoUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  const driveId = extractDriveId(value);
  if (driveId) {
    return `/api/photo?id=${driveId}`;
  }

  return value;
}

export function splitPhotoCell(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((part) => normalizePhotoUrl(part))
    .filter(Boolean);
}
