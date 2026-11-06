import { useEffect, useRef } from "react";
import { AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { DEFAULT_CENTER, GOOGLE_MAP_ID } from "../../config.js";
import { categoryById } from "../pins/categories.js";

const LONG_PRESS_MS = 550;

export default function MapCanvas({ pins, draft, selectedPinId, focus, onSelectPin, onLongPress, onPlaceClick, onMapClick }) {
  return (
    <Map
      className="map-canvas"
      mapId={GOOGLE_MAP_ID}
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      clickableIcons
      reuseMaps
      onClick={(event) => {
        if (event.detail.placeId) {
          // Suppress Google's default info window; we show our own sheet instead.
          event.stop();
          onPlaceClick(event.detail.placeId);
        } else {
          onMapClick();
        }
      }}
      onContextmenu={(event) => event.detail.latLng && onLongPress(event.detail.latLng)}
    >
      <LongPress onLongPress={onLongPress} />
      <CameraFocus focus={focus} />
      <FitToPins pins={pins} />

      {pins.map((pin) => (
        <AdvancedMarker
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          title={pin.title}
          zIndex={pin.id === selectedPinId ? 1000 : undefined}
          onClick={() => onSelectPin(pin.id)}
        >
          <PinMarker pin={pin} selected={pin.id === selectedPinId} />
        </AdvancedMarker>
      ))}

      {draft && (
        <AdvancedMarker position={{ lat: draft.lat, lng: draft.lng }} zIndex={1001}>
          <PinMarker pin={{ type: draft.type || "memory", icon: "✨" }} selected draft />
        </AdvancedMarker>
      )}
    </Map>
  );
}

function PinMarker({ pin, selected, draft }) {
  const icon = pin.icon || categoryById(pin.category).icon;
  return (
    <div className={`pin-marker pin-${pin.type}${selected ? " selected" : ""}${draft ? " draft" : ""}`}>
      <span>{icon}</span>
    </div>
  );
}

// Maps JS has no long-press event on touch screens, so time a press that stays put.
function LongPress({ onLongPress }) {
  const map = useMap();
  const callbackRef = useRef(onLongPress);
  callbackRef.current = onLongPress;

  useEffect(() => {
    if (!map) return undefined;
    let timer = null;
    const cancel = () => {
      clearTimeout(timer);
      timer = null;
    };
    const listeners = [
      map.addListener("mousedown", (event) => {
        cancel();
        const latLng = event.latLng?.toJSON();
        if (!latLng) return;
        timer = setTimeout(() => {
          timer = null;
          navigator.vibrate?.(15);
          callbackRef.current(latLng);
        }, LONG_PRESS_MS);
      }),
      map.addListener("mouseup", cancel),
      map.addListener("dragstart", cancel),
      map.addListener("zoom_changed", cancel)
    ];
    return () => {
      cancel();
      listeners.forEach((listener) => listener.remove());
    };
  }, [map]);

  return null;
}

function CameraFocus({ focus }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !focus) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    if (focus.zoom && (map.getZoom() || 0) < focus.zoom) map.setZoom(focus.zoom);
  }, [map, focus]);
  return null;
}

// Frame all pins once when they first load.
function FitToPins({ pins }) {
  const map = useMap();
  const doneRef = useRef(false);
  useEffect(() => {
    if (!map || doneRef.current || pins.length === 0) return;
    doneRef.current = true;
    if (pins.length === 1) {
      map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pins.forEach((pin) => bounds.extend({ lat: pin.lat, lng: pin.lng }));
    map.fitBounds(bounds, { top: 140, bottom: 80, left: 40, right: 40 });
  }, [map, pins]);
  return null;
}
