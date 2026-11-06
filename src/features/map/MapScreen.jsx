import { useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "../../config.js";
import { deletePin, newPinId, subscribePins } from "../../firebase/pins.js";
import { fetchPlaceDetails, reverseGeocode } from "../../lib/places.js";
import { categoryFromPlaceTypes } from "../pins/categories.js";
import BottomSheet from "../sheet/BottomSheet.jsx";
import PinDetail from "../sheet/PinDetail.jsx";
import PinEditor from "../sheet/PinEditor.jsx";
import Menu from "../menu/Menu.jsx";
import MapCanvas from "./MapCanvas.jsx";
import SearchBar from "./SearchBar.jsx";

const FILTERS = [
  { id: "all", label: "すべて" },
  { id: "memory", label: "思い出" },
  { id: "wishlist", label: "行ってみたい" }
];

export default function MapScreen(props) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="center-screen">
        <div className="card glass-card">
          <p>Google Maps のAPIキーが設定されていません。</p>
          <p className="muted">.env.local に VITE_GOOGLE_MAPS_API_KEY を設定してください。</p>
        </div>
      </div>
    );
  }
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="ja" region="JP">
      <MapScreenInner {...props} />
    </APIProvider>
  );
}

function MapScreenInner({ map, user }) {
  const [pins, setPins] = useState([]);
  const [pinsError, setPinsError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedPinId, setSelectedPinId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // new pin being created: { id, lat, lng, title, address, placeId, category, loading }
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focus, setFocus] = useState(null);
  const lastLongPressRef = useRef(0);

  const geocodingLib = useMapsLibrary("geocoding");
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    try {
      localStorage.setItem("memory-map:last-map", map.id);
    } catch {
      // ignore
    }
    return subscribePins(map.id, setPins, (error) => {
      console.error(error);
      setPinsError("ピンを読み込めませんでした。");
    });
  }, [map.id]);

  const visiblePins = useMemo(
    () => (filter === "all" ? pins : pins.filter((pin) => pin.type === filter)),
    [pins, filter]
  );
  const selectedPin = pins.find((pin) => pin.id === selectedPinId) || null;

  // A pin deleted by the partner disappears from under an open sheet.
  useEffect(() => {
    if (selectedPinId && !selectedPin && !editing) setSelectedPinId(null);
  }, [selectedPinId, selectedPin, editing]);

  function closeSheet() {
    setSelectedPinId(null);
    setEditing(false);
    setDraft(null);
    setExpanded(false);
  }

  function selectPin(pinId) {
    const pin = pins.find((item) => item.id === pinId);
    if (!pin) return;
    setDraft(null);
    setEditing(false);
    setSelectedPinId(pinId);
    setExpanded(false);
    setMenuOpen(false);
    setFocus({ lat: pin.lat, lng: pin.lng, zoom: 15, key: Date.now() });
  }

  function startDraft(base) {
    setSelectedPinId(null);
    setEditing(false);
    setExpanded(true);
    setDraft({ id: newPinId(map.id), type: filter === "wishlist" ? "wishlist" : "memory", ...base });
    setFocus({ lat: base.lat, lng: base.lng, key: Date.now() });
  }

  async function handleLongPress(latLng) {
    // Touch devices can fire both our long-press timer and a contextmenu event.
    if (Date.now() - lastLongPressRef.current < 800) return;
    lastLongPressRef.current = Date.now();
    startDraft({ ...latLng, title: "", address: "", placeId: "", loading: Boolean(geocodingLib) });
    if (!geocodingLib) return;
    try {
      const { name, address } = await reverseGeocode(geocodingLib, latLng);
      setDraft((current) => current && current.lat === latLng.lat ? { ...current, title: name, address, loading: false } : current);
    } catch (error) {
      console.warn("Reverse geocoding failed", error);
      setDraft((current) => current && { ...current, loading: false });
    }
  }

  async function handlePlaceClick(placeId) {
    if (!placesLib) return;
    try {
      const place = await fetchPlaceDetails(placesLib, placeId);
      startDraft({
        lat: place.lat,
        lng: place.lng,
        title: place.name,
        address: place.address,
        placeId,
        category: categoryFromPlaceTypes(place.types).id
      });
    } catch (error) {
      console.warn("Place details failed", error);
    }
  }

  function handlePickPlace(place) {
    startDraft({
      lat: place.lat,
      lng: place.lng,
      title: place.name,
      address: place.address,
      placeId: place.id,
      category: categoryFromPlaceTypes(place.types).id
    });
    setFocus({ lat: place.lat, lng: place.lng, zoom: 16, key: Date.now() });
  }

  async function handleDelete(pin) {
    if (!confirm(`「${pin.title}」を削除しますか？写真も削除されます。`)) return;
    try {
      await deletePin(map.id, pin);
      closeSheet();
    } catch (error) {
      console.error(error);
      alert("削除できませんでした。");
    }
  }

  const sheetOpen = Boolean(draft || selectedPin);

  return (
    <div className="map-screen">
      <MapCanvas
        pins={visiblePins}
        draft={draft}
        selectedPinId={selectedPinId}
        focus={focus}
        onSelectPin={selectPin}
        onLongPress={handleLongPress}
        onPlaceClick={handlePlaceClick}
        onMapClick={() => sheetOpen && !editing && !draft && closeSheet()}
      />

      <div className="map-overlay-top">
        <SearchBar onOpenMenu={() => setMenuOpen(true)} onPickPlace={handlePickPlace} />
        <div className="filter-chips">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className={`glass${filter === item.id ? " active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {pinsError && <p className="toast glass">{pinsError}</p>}
        {!sheetOpen && pins.length === 0 && (
          <p className="toast glass">地図を長押しするか、検索してピンを追加しましょう</p>
        )}
      </div>

      {sheetOpen && (
        <BottomSheet expanded={expanded || editing || Boolean(draft)} onExpandedChange={setExpanded} onClose={closeSheet}>
          {draft ? (
            <PinEditor
              key={draft.id}
              mapId={map.id}
              pinId={draft.id}
              pin={draft}
              isNew
              user={user}
              loadingAddress={draft.loading}
              onSaved={(pinId) => {
                setDraft(null);
                setSelectedPinId(pinId);
                setExpanded(false);
              }}
              onCancel={closeSheet}
            />
          ) : editing ? (
            <PinEditor
              key={selectedPin.id}
              mapId={map.id}
              pinId={selectedPin.id}
              pin={selectedPin}
              user={user}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <PinDetail pin={selectedPin} expanded={expanded} onEdit={() => setEditing(true)} onDelete={() => handleDelete(selectedPin)} />
          )}
        </BottomSheet>
      )}

      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} map={map} user={user} pins={pins} onSelectPin={selectPin} />
    </div>
  );
}
