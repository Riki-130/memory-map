// Browser-side settings. The Maps key is a referrer-restricted browser key supplied at
// build time (.env.local locally, GitHub Actions variables in production) — never commit it.
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// DEMO_MAP_ID works for development; production uses a Map ID with the theme styling.
export const GOOGLE_MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID";

export const PLACES_SEARCH_URL =
  "https://asia-northeast1-memory-map-rh130-2026103-eff07.cloudfunctions.net/searchPlaces";

export const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 };

export const MAX_PHOTOS_PER_PIN = 10;
export const INVITE_TTL_DAYS = 7;
