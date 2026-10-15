import { loadFriends } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadFriends();
  return Response.json(data);
}
