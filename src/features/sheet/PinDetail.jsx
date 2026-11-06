import { useState } from "react";
import PhotoImage from "../pins/PhotoImage.jsx";
import { PIN_TYPES, categoryById } from "../pins/categories.js";

export default function PinDetail({ pin, expanded, onEdit, onDelete }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const category = categoryById(pin.category);
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
        <span className="pin-heading-icon">{pin.icon || category.icon}</span>
        <div>
          <h2>{pin.title}</h2>
          {pin.address && <p className="pin-address">📍 {pin.address}</p>}
        </div>
      </div>

      <div className="chip-row">
        <span className={`chip chip-${pin.type}`}>{PIN_TYPES[pin.type]?.label}</span>
        <span className="chip">{category.label}</span>
        {pin.visitedAt && <span className="chip">🗓 {pin.visitedAt.replaceAll("-", "/")}</span>}
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

      <div className="sheet-actions">
        <button className="primary-button" type="button" onClick={onEdit}>編集</button>
        <a className="secondary-button" href={routeUrl} target="_blank" rel="noreferrer">ルート</a>
        <button className="danger-button" type="button" onClick={onDelete}>削除</button>
      </div>

      {viewerIndex !== null && (
        <div className="photo-viewer" role="dialog" aria-label="写真" onClick={() => setViewerIndex(null)}>
          <PhotoImage className="photo-viewer-image" path={photos[viewerIndex].path} alt="" />
          {photos.length > 1 && (
            <div className="photo-viewer-nav" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setViewerIndex((viewerIndex + photos.length - 1) % photos.length)}>‹</button>
              <span>{viewerIndex + 1} / {photos.length}</span>
              <button type="button" onClick={() => setViewerIndex((viewerIndex + 1) % photos.length)}>›</button>
            </div>
          )}
        </div>
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
