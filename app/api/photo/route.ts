const cache = new Map<string, { type: string; body: ArrayBuffer }>();

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[a-zA-Z0-9_-]{8,}$/.test(id)) {
    return new Response("Missing photo", { status: 400 });
  }

  const cached = cache.get(id);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": cached.type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const upstream = await fetch(
    `https://lh3.googleusercontent.com/d/${id}=w1200`,
    {
      headers: {
        Accept: "image/*",
        "User-Agent": "map-friends/1.0 (friends map)",
      },
      cache: "no-store",
    },
  );
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response("Photo unavailable", { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  cache.set(id, { type, body });
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
