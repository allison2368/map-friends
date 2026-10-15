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

const PIN_COLORS = ["#c45c26", "#2f5d50", "#7a3e48", "#3d6ea8", "#8a6a2f"];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function offsetOverlapping(friends: Friend[]): Friend[] {
  const groups = new Map<string, Friend[]>();
  for (const friend of friends) {
    const key = `${friend.lat.toFixed(3)},${friend.lng.toFixed(3)}`;
    const list = groups.get(key) ?? [];
    list.push(friend);
    groups.set(key, list);
  }

  const placed: Friend[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      placed.push(group[0]);
      continue;
    }
    group.forEach((friend, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      placed.push({
        ...friend,
        lat: friend.lat + Math.sin(angle) * 0.18,
        lng: friend.lng + Math.cos(angle) * 0.22,
      });
    });
  }
  return placed;
}

function FitUnitedStates() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(US_BOUNDS, { padding: [72, 72], animate: false });
  }, [map]);
  return null;
}

function FriendPin({
  friend,
  color,
  onSelect,
}: {
  friend: Friend;
  color: string;
  onSelect: (friend: Friend) => void;
}) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "friend-pin",
        html: `<span class="pin-hit"><span class="pin-dot" style="background:${color}"></span><span class="pin-name">${escapeHtml(friend.name)}</span></span>`,
        iconSize: [160, 58],
        iconAnchor: [80, 58],
      }),
    [color, friend.name],
  );

  return (
    <Marker
      position={[friend.lat, friend.lng]}
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
  const [status, setStatus] = useState("Loading friends…");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/friends")
      .then((response) => response.json() as Promise<FriendsResponse>)
      .then((data) => {
        if (cancelled) return;
        setFriends(offsetOverlapping(data.friends));
        setFormUrl(data.formUrl);
        setStatus(
          data.source === "sample"
            ? "Showing sample friends until a Google Form sheet is connected."
            : `${data.friends.length} friends from the form.`,
        );
      })
      .catch(() => {
        if (!cancelled) setStatus("Could not load friends.");
      });

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
        {friends.map((friend, index) => (
          <FriendPin
            key={friend.id}
            friend={friend}
            color={PIN_COLORS[index % PIN_COLORS.length]}
            onSelect={setSelected}
          />
        ))}
      </MapContainer>
      <div className="map-wash" aria-hidden="true" />
      <header className="title-overlay">
        <h1>title</h1>
      </header>
      <p className="map-status">{status}</p>
      {formUrl ? (
        <a className="form-link" href={formUrl} target="_blank" rel="noreferrer">
          Add yourself
        </a>
      ) : null}
      {selected ? (
        <FriendPopup friend={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
