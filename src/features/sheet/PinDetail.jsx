import { useState } from "react";
import PhotoImage from "../pins/PhotoImage.jsx";
import PhotoViewer from "../pins/PhotoViewer.jsx";
import { PIN_TYPES, categoryLabel, pinIcon } from "../pins/categories.js";

// Used in the map's bottom sheet and in the menu; the menu also passes onGoToPin.
export default function PinDetail({ pin, categories, expanded, onEdit, onDelete, onGoToPin }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const icon = pinIcon(pin);
  const photos = pin.photos || [];
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}` +
    (pin.placeId ? `&destination_place_id=${encodeURIComponent(pin.placeId)}` : "");

  return (
    <div className="pin-detail">
      {photos.length > 0 && (
        <div className={`photo-strip${expanded ? " large" : ""}`}>
          {photos.map((photo, index) => (
            <PhotoImage
              key={photo.id}
              className="photo-strip-item"
              path={expanded ? photo.path : photo.thumbPath}
              alt={`${pin.title}の写真 ${index + 1}`}
              onClick={() => setViewerIndex(index)}
            />
          ))}
        </div>
      )}

      <div className="pin-heading">
        <span className="pin-heading-icon">{icon}</span>
        <div>
          <h2>{pin.title}</h2>
          {pin.address && <p className="pin-address">📍 {pin.address}</p>}
        </div>
      </div>

      <div className="chip-row">
        <span className={`chip chip-${pin.type}`}>{PIN_TYPES[pin.type]?.label}</span>
        <span className="chip">{icon} {categoryLabel(icon, categories)}</span>
        {pin.type === "memory" && pin.visitedAt && <span className="chip">🗓 {pin.visitedAt.replaceAll("-", "/")}</span>}
        {photos.length > 0 && <span className="chip">📷 {photos.length}</span>}
      </div>

      {expanded && (
        <>
          {pin.memo && <p className="pin-memo">{pin.memo}</p>}
          {pin.videoLinks?.length > 0 && (
            <div className="video-links">
              <h3>動画</h3>
              {pin.videoLinks.map((link) => (
                <a key={link} href={link} target="_blank" rel="noreferrer">▶ {shortLink(link)}</a>
              ))}
            </div>
          )}
        </>
      )}

      {onGoToPin && (
        <div className="sheet-actions">
          <button className="primary-button" type="button" onClick={onGoToPin}>ピンに移動</button>
        </div>
      )}
      <div className="sheet-actions">
        <button className={onGoToPin ? "secondary-button" : "primary-button"} type="button" onClick={onEdit}>編集</button>
        <a className="secondary-button" href={routeUrl} target="_blank" rel="noreferrer">ルート</a>
        <button className="danger-button" type="button" onClick={onDelete}>削除</button>
      </div>

      {viewerIndex !== null && (
        <PhotoViewer photos={photos} startIndex={viewerIndex} title={pin.title} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}

function shortLink(link) {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}
