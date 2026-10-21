"use client";

import { useEffect, useState } from "react";

type PhotoCarouselProps = {
  name: string;
  photos: string[];
};

export function PhotoCarousel({ name, photos }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);
  const [portrait, setPortrait] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [photos]);

  useEffect(() => {
    setPortrait(false);
    setFailed(false);
    for (const src of photos) {
      const img = new Image();
      img.src = src;
    }
  }, [photos, index]);

  if (photos.length === 0) {
    return <div className="carousel-empty">No pictures uploaded yet.</div>;
  }

  const go = (direction: -1 | 1) => {
    setIndex((current) => (current + direction + photos.length) % photos.length);
  };

  return (
    <div className="carousel">
      <div className="carousel-frame">
        {failed ? (
          <div className="carousel-empty">This picture could not be loaded.</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[index]}
            alt={`${name} photo ${index + 1}`}
            className={portrait ? "portrait" : undefined}
            onLoad={(event) => {
              const img = event.currentTarget;
              setPortrait(img.naturalHeight > img.naturalWidth);
            }}
            onError={() => setFailed(true)}
          />
        )}
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              className="carousel-nav prev"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="carousel-nav next"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <p className="carousel-count">
          {index + 1} / {photos.length}
        </p>
      ) : null}
      {photos.length > 1 ? (
        <div className="carousel-dots" role="tablist" aria-label="Photos">
          {photos.map((photo, photoIndex) => (
            <button
              key={`${photo}-${photoIndex}`}
              type="button"
              className={photoIndex === index ? "dot active" : "dot"}
              onClick={() => setIndex(photoIndex)}
              aria-label={`Show photo ${photoIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
