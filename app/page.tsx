"use client";

import dynamic from "next/dynamic";

const FriendsMap = dynamic(
  () => import("@/components/FriendsMap").then((mod) => mod.FriendsMap),
  { ssr: false },
);

export default function Home() {
  return (
    <main className="map-shell">
      <FriendsMap />
    </main>
  );
}
