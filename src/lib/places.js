import { auth } from "../firebase/app.js";
import { PLACES_SEARCH_URL } from "../config.js";

// Text search goes through the searchPlaces Cloud Function, which holds the Places key
// and only answers signed-in users from allowed origins.
export async function searchPlaces(query) {
  const cacheKey = `places-search:${query}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // sessionStorage may be unavailable (private mode); search without cache
  }

  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("not signed in");

  const response = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ query })
  });
  if (!response.ok) throw new Error(`Places search failed: ${response.status}`);

  const { places = [] } = await response.json();
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(places));
  } catch {
    // ignore cache write failures
  }
  return places;
}

export async function reverseGeocode(geocodingLib, latLng) {
  const geocoder = new geocodingLib.Geocoder();
  const { results } = await geocoder.geocode({ location: latLng, language: "ja", region: "JP" });
  const best = results[0];
  if (!best) return { address: "", name: "" };
  const address = best.formatted_address.replace(/^日本、\s*/, "").replace(/^〒\d{3}-\d{4}\s*/, "");
  return { address, name: shortName(address) };
}

// "東京都千代田区丸の内1丁目9" -> "千代田区丸の内1丁目" as a default, editable pin title.
function shortName(address) {
  const withoutPrefecture = address.replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/, "");
  return withoutPrefecture.replace(/[0-9０-９-－]+(番地?|号)?$/, "").trim() || address;
}

export async function fetchPlaceDetails(placesLib, placeId) {
  const place = new placesLib.Place({ id: placeId, requestedLanguage: "ja" });
  await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "types"] });
  return {
    placeId,
    name: place.displayName || "",
    address: (place.formattedAddress || "").replace(/^日本、\s*/, "").replace(/^〒\d{3}-\d{4}\s*/, ""),
    lat: place.location?.lat(),
    lng: place.location?.lng(),
    types: place.types || []
  };
}
