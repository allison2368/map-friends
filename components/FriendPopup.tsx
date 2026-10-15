"use client";

import type { Friend } from "@/lib/types";
import { PhotoCarousel } from "./PhotoCarousel";

type FriendPopupProps = {
  friend: Friend;
  onClose: () => void;
};

export function FriendPopup({ friend, onClose }: FriendPopupProps) {
  return (
    <div className="popup-backdrop" onClick={onClose} role="presentation">
      <article
        className="friend-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="friend-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="popup-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="friend-popup-title">{friend.name}</h2>
        <p className="popup-location">{friend.location}</p>
        <PhotoCarousel name={friend.name} photos={friend.photos} />
        {friend.answers.length > 0 ? (
          <ul className="answer-list">
            {friend.answers.map((item) => (
              <li key={item.question}>
                <p className="answer-question">{item.question}</p>
                <p className="answer-text">• {item.answer}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="popup-empty">No form answers yet.</p>
        )}
      </article>
    </div>
  );
}
