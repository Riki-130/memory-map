import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PhotoImage from "./PhotoImage.jsx";

// Full-screen photo viewer. Rendered into <body> via a portal so it is never clipped by
// the bottom sheet or side menu (their backdrop-filter/transform would trap it).
// Swipe (scroll-snap) or use the arrows to move between photos; × returns to the pin.
export default function PhotoViewer({ photos, startIndex, title, onClose }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = startIndex * track.clientWidth;
  }, [startIndex]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function go(nextIndex) {
    const track = trackRef.current;
    if (!track || nextIndex < 0 || nextIndex >= photos.length) return;
    track.scrollTo({ left: nextIndex * track.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const track = trackRef.current;
    if (track) setIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  return createPortal(
    <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={`${title}の写真`}>
      <button className="photo-viewer-close" type="button" aria-label="閉じる" onClick={onClose}>×</button>
      <div className="photo-viewer-track" ref={trackRef} onScroll={handleScroll}>
        {photos.map((photo, photoIndex) => (
          <div key={photo.id} className="photo-viewer-slide">
            <PhotoImage className="photo-viewer-image" path={photo.path} alt={`${title}の写真 ${photoIndex + 1}`} />
          </div>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="photo-viewer-nav">
          <button type="button" aria-label="前の写真" onClick={() => go(index - 1)} disabled={index === 0}>‹</button>
          <span>{index + 1} / {photos.length}</span>
          <button type="button" aria-label="次の写真" onClick={() => go(index + 1)} disabled={index === photos.length - 1}>›</button>
        </div>
      )}
    </div>,
    document.body
  );
}
