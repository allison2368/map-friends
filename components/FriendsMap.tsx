"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Friend, FriendsResponse } from "@/lib/types";
import { FriendPopup } from "./FriendPopup";

const US_BOUNDS: L.LatLngBoundsExpression = [
  [24.4, -125.2],
  [49.4, -66.8],
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type PlaceGroup = {
  key: string;
  lat: number;
  lng: number;
  friends: Friend[];
};

function groupByPlace(friends: Friend[]): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();
  for (const friend of friends) {
    const key = `${friend.lat.toFixed(3)},${friend.lng.toFixed(3)}`;
    const existing = groups.get(key);
    if (existing) {
      existing.friends.push(friend);
      continue;
    }
    groups.set(key, {
      key,
      lat: friend.lat,
      lng: friend.lng,
      friends: [friend],
    });
  }
  return [...groups.values()];
}

function FitUnitedStates() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(US_BOUNDS, { padding: [72, 72], animate: false });
  }, [map]);
  return null;
}

const TREES = ["🌲", "🌳", "🌴"];

function hashString(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function treeFor(seed: string): string {
  return TREES[hashString(seed) % TREES.length];
}

function cityAnchor(group: PlaceGroup): { lat: number; lng: number } {
  const inSanFrancisco =
    Math.abs(group.lat - 37.788) < 0.04 && Math.abs(group.lng + 122.408) < 0.04;
  if (inSanFrancisco) {
    return { lat: 37.759, lng: -122.438 };
  }
  return { lat: group.lat, lng: group.lng };
}

function scatterAroundCity(group: PlaceGroup): Array<{ friend: Friend; lat: number; lng: number }> {
  if (group.friends.length === 1) {
    return [{ friend: group.friends[0], lat: group.lat, lng: group.lng }];
  }

  const anchor = cityAnchor(group);
  const inSanFrancisco =
    Math.abs(group.lat - 37.788) < 0.04 && Math.abs(group.lng + 122.408) < 0.04;
  const chord = inSanFrancisco ? 0.033 : 0.014;
  const latStretch = inSanFrancisco ? 1.45 : 1;
  const radius = chord / (2 * Math.sin(Math.PI / group.friends.length));
  const rotation = (hashString(group.key) / 0xffffffff) * Math.PI * 2;
  const lngScale = Math.cos((anchor.lat * Math.PI) / 180) || 1;

  return group.friends.map((friend, index) => {
    const spin = (hashString(friend.id) % 1000) / 1000;
    const angle = rotation + (index / group.friends.length) * Math.PI * 2 + (spin - 0.5) * 0.25;
    const distance = radius * (0.9 + spin * 0.12);
    return {
      friend,
      lat: anchor.lat + distance * Math.cos(angle) * latStretch,
      lng: anchor.lng + (distance * Math.sin(angle)) / lngScale,
    };
  });
}

function treeHtml(seed: string): string {
  return `<span class="pin-tree" aria-hidden="true">${treeFor(seed)}</span>`;
}

function FriendPin({
  friend,
  lat,
  lng,
  onSelect,
}: {
  friend: Friend;
  lat: number;
  lng: number;
  onSelect: (friend: Friend) => void;
}) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "friend-pin",
        html: `<span class="pin-hit">${treeHtml(friend.id)}<span class="pin-name">${escapeHtml(friend.name)}</span></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [friend.id, friend.name],
  );

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      title={friend.name}
      alt={friend.name}
      eventHandlers={{
        click: () => onSelect(friend),
      }}
    />
  );
}

export function FriendsMap() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [formUrl, setFormUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Friend | null>(null);
  const places = useMemo(() => groupByPlace(friends), [friends]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/friends")
      .then((response) => response.json() as Promise<FriendsResponse>)
      .then((data) => {
        if (cancelled) return;
        setFriends(data.friends);
        setFormUrl(data.formUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        minZoom={3}
        maxZoom={12}
        zoomControl={false}
        className="map-root"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        <FitUnitedStates />
        {places.flatMap((place) =>
          scatterAroundCity(place).map(({ friend, lat, lng }) => (
            <FriendPin
              key={friend.id}
              friend={friend}
              lat={lat}
              lng={lng}
              onSelect={setSelected}
            />
          )),
        )}
      </MapContainer>
      <div className="map-wash" aria-hidden="true" />
      <header className="title-overlay">
        <h1>forest!</h1>
      </header>
      {formUrl ? (
        <a className="form-link" href={formUrl} target="_blank" rel="noreferrer">
          google form
        </a>
      ) : null}
      {selected ? (
        <FriendPopup friend={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
